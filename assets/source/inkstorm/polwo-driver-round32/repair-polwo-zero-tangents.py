#!/usr/bin/env python3
"""Repair only zero XYZ tangent vectors in a new source derivative; retain W.

Prefer area-weighted valid adjacent UV triangles, then a compatible split vertex.
For fully degenerate UV neighborhoods use a documented normal-orthogonal basis.
Never change positions, UVs, normals, indices, nonzero tangents, or image bytes.
"""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path

import numpy as np

from _polwo_glb import accessor_values, read_glb, sha, statistics, write_glb_bytes

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    source, output = args.input.resolve(), args.output.resolve()
    receipt_path = output.with_suffix('.tangent-repair-receipt.json')
    if not output.is_relative_to(ROOT) or source == output or output.exists() or receipt_path.exists():
        raise ValueError('Require new source-only derivative and receipt paths')
    raw, doc, binary = read_glb(source)
    fixed = bytearray(binary)
    repairs = []
    allowed = set()
    handled = set()
    for mesh_index, mesh in enumerate(doc['meshes']):
        for primitive_index, primitive in enumerate(mesh['primitives']):
            attrs = primitive['attributes']
            tangent_index = attrs.get('TANGENT')
            if tangent_index is None:
                continue
            if tangent_index in handled:
                raise ValueError('Shared tangent accessor requires explicit review')
            handled.add(tangent_index)
            accessor = doc['accessors'][tangent_index]
            if accessor['componentType'] != 5126 or accessor['type'] != 'VEC4':
                raise ValueError('Expected float32 VEC4 tangents')
            tangents = np.array(list(accessor_values(doc, binary, tangent_index)), dtype=np.float64)
            if not np.isfinite(tangents).all() or not np.all(np.abs(np.abs(tangents[:, 3]) - 1) < 1e-5):
                raise ValueError('Nonfinite or invalid W is outside this narrow repair')
            invalid = np.where(np.sum(tangents[:, :3] ** 2, axis=1) < 1e-12)[0]
            if len(invalid) == 0:
                continue
            positions = np.array(list(accessor_values(doc, binary, attrs['POSITION'])), dtype=np.float64)
            normals = np.array(list(accessor_values(doc, binary, attrs['NORMAL'])), dtype=np.float64)
            if 'TEXCOORD_0' not in attrs:
                raise ValueError('Mapped source repair requires TEXCOORD_0')
            uv = np.array(list(accessor_values(doc, binary, attrs['TEXCOORD_0'])), dtype=np.float64)
            triangles = np.array(list(accessor_values(doc, binary, primitive['indices'])), dtype=np.int64).reshape(-1, 3)
            e1 = positions[triangles[:, 1]] - positions[triangles[:, 0]]
            e2 = positions[triangles[:, 2]] - positions[triangles[:, 0]]
            d1 = uv[triangles[:, 1]] - uv[triangles[:, 0]]
            d2 = uv[triangles[:, 2]] - uv[triangles[:, 0]]
            determinant = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]
            area = np.linalg.norm(np.cross(e1, e2), axis=1)
            valid_faces = (np.abs(determinant) > 1e-12) & (area > 1e-12)
            face_tangent = np.zeros_like(e1)
            face_tangent[valid_faces] = (e1[valid_faces] * d2[valid_faces, 1, None]
                                         - e2[valid_faces] * d1[valid_faces, 1, None]) / determinant[valid_faces, None]
            vertex_rows = {}
            for i, position in enumerate(positions):
                vertex_rows.setdefault(tuple(position), []).append(i)
            view = doc['bufferViews'][accessor['bufferView']]
            stride = view.get('byteStride', 16)
            for vertex in invalid:
                n = normals[vertex]
                if not np.isfinite(n).all() or np.linalg.norm(n) < 1e-10:
                    raise ValueError('Cannot build basis from an invalid source normal')
                n = n / np.linalg.norm(n)
                adjacent = np.flatnonzero(np.any(triangles == vertex, axis=1))
                valid_adjacent = adjacent[valid_faces[adjacent]]
                t = np.sum(face_tangent[valid_adjacent] * area[valid_adjacent, None], axis=0)
                t -= n * np.dot(n, t)
                method = 'area-weighted adjacent nondegenerate UV triangle'
                donor = None
                if np.linalg.norm(t) < 1e-10:
                    for row in vertex_rows[tuple(positions[vertex])]:
                        other_n = normals[row] / max(np.linalg.norm(normals[row]), 1e-10)
                        if np.dot(other_n, n) > .99999 and np.max(np.abs(uv[row] - uv[vertex])) < 1e-7 and np.linalg.norm(tangents[row, :3]) > 1e-6:
                            t = tangents[row, :3] - n * np.dot(n, tangents[row, :3])
                            if np.linalg.norm(t) > 1e-10:
                                donor, method = int(row), 'compatible split vertex with equal position/UV and matching normal'
                                break
                if np.linalg.norm(t) < 1e-10:
                    axis = np.eye(3)[int(np.argmin(np.abs(n)))]
                    t = axis - n * np.dot(n, axis)
                    method = 'fallback least-aligned axis projected perpendicular to normal; no recoverable UV tangent'
                t /= np.linalg.norm(t)
                offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0) + int(vertex) * stride
                fixed[offset:offset + 12] = struct.pack('<3f', *t)
                allowed.update(range(offset, offset + 12))
                repairs.append({'mesh': mesh_index, 'meshName': mesh.get('name'), 'primitive': primitive_index,
                                'accessor': tangent_index, 'vertex': int(vertex), 'before': tangents[vertex].tolist(),
                                'after': [*t.tolist(), float(tangents[vertex, 3])], 'basis': method, 'donorVertex': donor,
                                'adjacentTriangles': adjacent.tolist(), 'validUvAdjacentCount': len(valid_adjacent),
                                'degenerateUvAdjacentCount': int(np.sum(np.abs(determinant[adjacent]) <= 1e-12)),
                                'degenerateGeometryAdjacentCount': int(np.sum(area[adjacent] <= 1e-12))})
    if not repairs:
        raise ValueError('No zero tangent XYZ vectors found; do not create an unnecessary derivative')
    changed = {i for i, (a, b) in enumerate(zip(binary, fixed)) if a != b}
    if len(binary) != len(fixed) or not changed.issubset(allowed):
        raise ValueError('Unexpected non-tangent BIN mutation')
    stats = statistics(doc, bytes(fixed))
    candidate = write_glb_bytes(doc, bytes(fixed))
    if source.read_bytes() != raw:
        raise ValueError('Input changed during repair')
    receipt = {'input': str(source), 'inputSha256': sha(raw), 'output': str(output), 'outputSha256': sha(candidate),
               'zeroTangentXYZBefore': len(repairs), 'invalidTangentAfter': 0, 'changedBinBytes': len(changed),
               'onlyPreviouslyZeroTangentXYZChanged': True, 'tangentWPreserved': True,
               'positionsNormalsUVsIndicesImagesAndNonzeroTangentsExact': True, 'gltfJsonSemanticsExact': True,
               'fallbackCount': sum(r['basis'].startswith('fallback') for r in repairs), 'repairs': repairs,
               'statistics': stats, 'visualAcceptance': False,
               'limitations': ['UV-degenerate vertices have no unique normal-map tangent; fallback basis is explicit',
                              'This numerical repair does not close shoulder holes or establish driver contact/visual acceptance']}
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('xb') as handle:
        handle.write(candidate)
    with receipt_path.open('x') as handle:
        json.dump(receipt, handle, indent=2)
        handle.write('\n')
    print(json.dumps({'output': str(output), 'sha256': sha(candidate), 'beforeInvalid': len(repairs),
                      'afterInvalid': 0, 'fallbackCount': receipt['fallbackCount'], 'receipt': str(receipt_path)}, indent=2))


if __name__ == '__main__':
    main()
