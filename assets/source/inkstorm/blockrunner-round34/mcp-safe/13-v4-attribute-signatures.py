"""Definitions only. Requires fnv1a64_signature and name_key from safe01.
Use this exact format for V4/final-copy/bake/render paintAttributeSignatures.
"""
BLOCKRUNNER_V4_ATTRIBUTE_NAMES = ('Inkstorm V4 Edge Distance', 'Inkstorm V4 Edge Strength')


def paint_attribute_signatures(scene):
    result = {}
    for ob in sorted(scene.objects, key=name_key):
        if ob.type != 'MESH':
            continue
        layers = {}
        for attribute_name in BLOCKRUNNER_V4_ATTRIBUTE_NAMES:
            attribute = ob.data.color_attributes.get(attribute_name)
            if attribute is not None:
                layers[attribute.name] = {
                    'domain': attribute.domain,
                    'dataType': attribute.data_type,
                    'length': len(attribute.data),
                    'colorsFnv1a64': fnv1a64_signature([list(item.color) for item in attribute.data])}
        result[ob.name] = layers
    return result
