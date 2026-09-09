#!/usr/bin/env python3
"""Package an explicitly supplied *baked* Polwo GLB into a new source-only candidate.

Requires Pillow and numpy. Does not bake/recolor, simplify, alter mesh accessors,
flip normal channels, change ORM channels/factors, or write to public/runtime.
Use the bundled workspace Python. Nothing executes on import.
"""
from __future__ import annotations

import argparse
import copy
import io
import json
import math
import re
from pathlib import Path

import numpy as np
from PIL import Image

from _polwo_glb import (accessor_bytes, budget_check, image_roles, image_source,
                        mesh_fingerprints, read_glb, sha, statistics, texture_infos,
                        view_bytes, write_glb_bytes)

ROOT = Path(__file__).resolve().parent
PARTS = ('accent', 'hardware', 'rubber', 'shell', 'suit', 'webbing')
CAPS = {
    'hero': {('body', 'color'): 1024, ('body', 'normal'): 1024, ('body', 'data'): 1024,
             ('pilot', 'color'): 1024, ('pilot', 'normal'): 512, ('pilot', 'data'): 512},
    'rival': {('body', 'color'): 512, ('body', 'normal'): 512, ('body', 'data'): 512,
              ('pilot', 'color'): 512, ('pilot', 'normal'): 256, ('pilot', 'data'): 256},
}


def resize_channel(array, size):
    return np.asarray(Image.fromarray(array.astype(np.float32)).resize(size, Image.Resampling.LANCZOS), dtype=np.float32)


def resize_image(payload, role, cap):
    with Image.open(io.BytesIO(payload)) as image:
        image.load()
        image = image.convert('RGBA')
        before = image.size
        scale = min(1.0, cap / max(before))
        size = tuple(max(1, int(round(x * scale))) for x in before)
        pixels = np.asarray(image).astype(np.float32) / 255
    if size != before:
        rgb, alpha = pixels[:, :, :3], pixels[:, :, 3]
        if role == 'color':
            # Color filtering in linear light; stored/output texels remain sRGB.
            values = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
        elif role == 'normal':
            values = rgb * 2 - 1
        else:
            values = rgb
        values = np.stack([resize_channel(values[:, :, i], size) for i in range(3)], axis=-1)
        if role == 'color':
            values = np.clip(values, 0, 1)
            values = np.where(values <= .0031308, values * 12.92, 1.055 * values ** (1 / 2.4) - .055)
        elif role == 'normal':
            magnitude = np.linalg.norm(values, axis=-1, keepdims=True)
            values = np.where(magnitude > 1e-8, values / np.maximum(magnitude, 1e-8), np.array([0, 0, 1]))
            values = values * .5 + .5
        alpha = resize_channel(alpha, size)
        pixels = np.concatenate([values, alpha[:, :, None]], axis=-1)
    output = Image.fromarray(np.rint(np.clip(pixels, 0, 1) * 255).astype(np.uint8), 'RGBA')
    stream = io.BytesIO()
    output.save(stream, format='PNG', optimize=True)
    return stream.getvalue(), before, size


def canonical_names(doc):
    mapping = []
    expected = {'polwo-body-0', 'polwo-body-1'} | {'polwo-pilot-' + p for p in PARTS}
    found = set()
    for node in doc['nodes']:
        if 'mesh' not in node:
            continue
        original = node.get('name', '')
        suffix = r'(?:\.\d+)?(?: (?:fit|paint|repair|shoulder-repair)-v\d+)*'
        body = re.fullmatch(r'(polwo-body-[01])' + suffix, original)
        pilot = re.fullmatch(r'(polwo-pilot-(?:' + '|'.join(PARTS) + r'))' + suffix, original)
        match = body or pilot
        if not match or match[1] in found:
            raise ValueError('Unexpected/duplicate mesh node name; review the bake contract: ' + original)
        node['name'] = match[1]
        found.add(match[1])
        mapping.append({'from': original, 'to': match[1]})
    if found != expected:
        raise ValueError('Expected precisely two body and six pilot mesh nodes')
    for material in doc['materials']:
        name = material.get('name', '')
        match = re.fullmatch(r'(Pilot atlas v4c runtime (?:' + '|'.join(PARTS) + r'))(?:\.\d+)?', name)
        if match:
            material['name'] = match[1]
    names = [m.get('name') for m in doc['materials']]
    if len(set(names)) != len(names):
        raise ValueError('Material names must remain unique')
    return mapping


def add_measured_anchors(doc, path):
    if path is None:
        return {'status': 'pending DCC measurement; no positions invented', 'attachments': {}}
    record = json.loads(path.read_text())
    provenance = record.get('measurement')
    if not provenance and isinstance(record.get('scope'), str) and isinstance(record.get('basis'), dict):
        provenance = {'scope': record['scope'], 'basis': record['basis'], 'sourceUid': record.get('sourceUid')}
    if not provenance:
        raise ValueError('Attachment input requires measurement provenance or source-study scope/basis')
    attachments = record.get('attachments', {})
    expected = {'pilot', 'exhaustLeft', 'exhaustRight', 'couplingLeft', 'couplingRight'}
    if set(attachments) != expected:
        raise ValueError('Supply all five measured model-root attachments')
    output = {}
    for key, item in attachments.items():
        if set(item) - {'position', 'rotationQuaternion'}:
            raise ValueError('Attachment fields must be position and optional rotationQuaternion')
        position = item['position']
        if len(position) != 3 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in position):
            raise ValueError('Attachment position must be three finite model-root coordinates')
        node = {'name': 'polwo-anchor-' + key, 'translation': position}
        if 'rotationQuaternion' in item:
            q = item['rotationQuaternion']
            if len(q) != 4 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in q) or abs(sum(v*v for v in q) - 1) > 1e-5:
                raise ValueError('Attachment quaternion must be normalized x/y/z/w')
            node['rotation'] = q
        if any(n.get('name') == node['name'] for n in doc['nodes']):
            raise ValueError('Duplicate attachment node')
        index = len(doc['nodes'])
        doc['nodes'].append(node)
        doc['scenes'][doc.get('scene', 0)]['nodes'].append(index)
        output[key] = {'node': node['name'], 'position': [0, 0, 0]}
    return {'status': 'source-study root anchors supplied; nozzle/contact confirmation pending',
            'visuallyAccepted': False, 'measurement': provenance,
            'inputSha256': sha(path.read_bytes()), 'attachments': output}


def package(args):
    source, output = args.input.resolve(), args.output.resolve()
    receipt_path = output.with_suffix('.package-receipt.json')
    if not output.is_relative_to(ROOT) or source == output:
        raise ValueError('Output must be a new file inside polwo-driver-round32')
    if output.exists() or receipt_path.exists():
        raise FileExistsError('Refusing to overwrite a candidate or its receipt')
    raw, original, binary = read_glb(source)
    if len(original.get('scenes', [])) != 1:
        raise ValueError('Expected one isolated exported source scene')
    before = statistics(original, binary)
    geometry = mesh_fingerprints(original, binary)
    doc = copy.deepcopy(original)
    names = canonical_names(doc)
    roles = image_roles(doc)
    image_views = [i['bufferView'] for i in doc['images']]
    if len(set(image_views)) != len(image_views):
        raise ValueError('Shared image buffer view needs explicit review')
    if any(a.get('bufferView') in image_views for a in doc['accessors']):
        raise ValueError('Image and mesh accessor share storage')
    replacements, image_receipts = {}, []
    for index, image in enumerate(doc['images']):
        owner, role = roles[index]
        cap = CAPS[args.profile][(owner, role)]
        payload = view_bytes(original, binary, image['bufferView'])
        resized, before_size, after_size = resize_image(payload, role, cap)
        replacements[image['bufferView']] = resized
        image['mimeType'] = 'image/png'
        image_receipts.append({'image': index, 'owner': owner, 'role': role, 'beforeSize': before_size,
                               'afterSize': after_size, 'inputSha256': sha(payload), 'outputSha256': sha(resized)})
    # Repack bufferViews; preserve every non-image view byte-for-byte.
    packed = bytearray()
    for index, view in enumerate(doc['bufferViews']):
        packed.extend(b'\0' * (-len(packed) % 4))
        payload = replacements.get(index, view_bytes(original, binary, index))
        view['byteOffset'], view['byteLength'] = len(packed), len(payload)
        packed.extend(payload)
    # All six image payloads are now ordinary PNG. Preserve sampler/UV settings.
    for texture in doc['textures']:
        source_image = image_source(texture)
        texture['source'] = source_image
        extension = texture.get('extensions', {})
        extension.pop('EXT_texture_webp', None)
        if not extension:
            texture.pop('extensions', None)
    for key in ('extensionsUsed', 'extensionsRequired'):
        if key in doc:
            doc[key] = [e for e in doc[key] if e != 'EXT_texture_webp']
            if not doc[key]:
                del doc[key]
    textures, remap, seen = [], {}, {}
    for index, texture in enumerate(doc['textures']):
        signature = json.dumps(texture, sort_keys=True)
        if signature not in seen:
            seen[signature] = len(textures)
            textures.append(texture)
        remap[index] = seen[signature]
    for _, info in texture_infos(doc['materials']):
        info['index'] = remap[info['index']]
    doc['textures'] = textures
    anchors = add_measured_anchors(doc, args.attachments)
    final_binary = bytes(packed)
    if mesh_fingerprints(doc, final_binary) != geometry:
        raise ValueError('Mesh/accessor preservation check failed')
    for index in range(len(original['accessors'])):
        if accessor_bytes(doc, final_binary, index) != accessor_bytes(original, binary, index):
            raise ValueError('Accessor bytes changed')
    for index, node in enumerate(original['nodes']):
        if {k: v for k, v in node.items() if k != 'name'} != {k: v for k, v in doc['nodes'][index].items() if k != 'name'}:
            raise ValueError('An existing node transform/hierarchy changed')
    after = statistics(doc, final_binary)
    budget_check(after, triangles=60000 if args.profile == 'hero' else 30000,
                 decoded_mib=24 if args.profile == 'hero' else 6)
    candidate = write_glb_bytes(doc, final_binary)
    if len(candidate) > args.max_file_mib * 1024 * 1024:
        raise ValueError('Encoded GLB file exceeds configured package cap')
    if source.read_bytes() != raw:
        raise ValueError('Input changed during packaging')
    receipt = {'status': 'source candidate packaged; live visual/performance review pending', 'profile': args.profile,
               'input': str(source), 'inputSha256': sha(raw), 'output': str(output), 'outputSha256': sha(candidate),
               'inputBytes': len(raw), 'outputBytes': len(candidate), 'inputStatistics': before, 'outputStatistics': after,
               'meshAccessorBytesExact': True, 'allNonImageBufferViewsExact': True,
               'existingNodeTransformsHierarchyExact': True, 'normalMapChannelConvention': 'RGB preserved; resized vectors renormalized; no green flip',
               'ormChannelConvention': 'R occlusion / G roughness / B metallic preserved, no floors added by packager',
               'resampling': 'Lanczos; sRGB color in linear light, ORM scalar channels in linear data, normal vectors renormalized',
               'textureBudgetDefinition': 'unique RGBA8 images with a complete mip chain; estimate, not measured GPU allocation',
               'sourceTextureBytesPreservedInInput': True, 'nodeNameChanges': names, 'imageChanges': image_receipts,
               'runtimeContract': {'embeddedPilotNodePrefix': 'polwo-pilot-', **anchors},
               'materialNames': [m.get('name') for m in doc['materials']],
               'runtimeIntegrated': False, 'limitations': ['No browser import or perceptual test performed by this script',
                   'Reduced atlas resolution requires original/concept/actual gameplay comparison',
                   'Decoded budget counts unique image payloads; verify actual renderer allocations and texture sharing']}
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('xb') as handle:
        handle.write(candidate)
    with receipt_path.open('x') as handle:
        json.dump(receipt, handle, indent=2)
        handle.write('\n')
    print(json.dumps({'output': str(output), 'receipt': str(receipt_path), 'sha256': sha(candidate),
                      'triangles': after['triangles'], 'draws': after['opaqueDraws'], 'rgba8FullMipMiB': after['rgba8FullMipBytes'] / 1048576}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True, help='Explicitly approved baked source GLB, preserved unchanged')
    parser.add_argument('--output', type=Path, required=True, help='New source-only candidate filename in this directory')
    parser.add_argument('--attachments', type=Path, help='Optional measured root-anchor JSON; no guessed defaults')
    parser.add_argument('--profile', choices=('hero', 'rival'), default='hero', help='Hero: 60k/24 MiB; rival: 30k/6 MiB')
    parser.add_argument('--max-file-mib', type=float, default=12)
    package(parser.parse_args())


if __name__ == '__main__':
    main()
