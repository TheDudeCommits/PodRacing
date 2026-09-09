#!/usr/bin/env python3
"""Read-only Polwo source preflight; prints JSON and exits nonzero on failure.

Use --baseline with the exact baked input to independently check geometry,
existing node transforms, and material/texture channel contracts. No file writes.
"""
from __future__ import annotations

import argparse
import copy
import json

from _polwo_glb import (budget_check, image_roles, image_source, mesh_fingerprints,
                        read_glb, sha, statistics, texture_infos)


def semantic_materials(doc):
    materials = copy.deepcopy(doc['materials'])
    for material in materials:
        material.pop('name', None)
        for _, info in texture_infos(material):
            texture = copy.deepcopy(doc['textures'][info['index']])
            image = image_source(texture)
            texture.pop('source', None)
            texture.get('extensions', {}).pop('EXT_texture_webp', None)
            if not texture.get('extensions'):
                texture.pop('extensions', None)
            # Image index remains stable in this intentionally narrow packager.
            info['index'] = {'image': image, 'binding': texture}
    return materials


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidate')
    parser.add_argument('--baseline')
    parser.add_argument('--triangle-budget', type=int, choices=(30000, 60000), default=60000)
    parser.add_argument('--decoded-mib', type=float, default=24)
    args = parser.parse_args()
    raw, doc, binary = read_glb(args.candidate)
    stats = statistics(doc, binary)
    failures = []
    try:
        budget_check(stats, args.triangle_budget, args.decoded_mib)
    except ValueError as error:
        failures.append(str(error))
    preservation = None
    if args.baseline:
        source_raw, source, source_binary = read_glb(args.baseline)
        geometry_exact = mesh_fingerprints(doc, binary) == mesh_fingerprints(source, source_binary)
        nodes_exact = len(doc['nodes']) >= len(source['nodes']) and all(
            {k: v for k, v in n.items() if k != 'name'} == {k: v for k, v in doc['nodes'][i].items() if k != 'name'}
            for i, n in enumerate(source['nodes']))
        materials_exact = semantic_materials(doc) == semantic_materials(source)
        roles_exact = image_roles(doc) == image_roles(source)
        preservation = {'baselineSha256': sha(source_raw), 'meshAndAccessorPayloadsExact': geometry_exact,
                        'existingNodeTransformsHierarchyExact': nodes_exact, 'materialFactorsAndTextureBindingsExact': materials_exact,
                        'imageChannelRolesExact': roles_exact}
        if not all((geometry_exact, nodes_exact, materials_exact, roles_exact)):
            failures.append('Baseline geometry/node/material/channel preservation mismatch')
    contract_names = {n.get('name') for n in doc['nodes'] if 'mesh' in n}
    expected = {'polwo-body-0', 'polwo-body-1'} | {'polwo-pilot-' + part for part in ('accent', 'hardware', 'rubber', 'shell', 'suit', 'webbing')}
    if contract_names != expected:
        failures.append('Canonical two-body/six-pilot node contract missing')
    report = {'file': args.candidate, 'sha256': sha(raw), 'bytes': len(raw), 'statistics': stats,
              'preservation': preservation, 'sourcePreflightPass': not failures, 'failures': failures,
              'measuredRuntimeGpuAllocation': False, 'liveImportOrVisualAcceptance': False,
              'embeddedPilotNodePrefix': 'polwo-pilot-',
              'anchorNodes': [n.get('name') for n in doc['nodes'] if n.get('name', '').startswith('polwo-anchor-')]}
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
