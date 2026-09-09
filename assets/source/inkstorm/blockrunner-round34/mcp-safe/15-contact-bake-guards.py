"""Definitions only; explicit 15d node guard remains unchanged."""


def contact_normalized_emission_graph(material, state):
    row = material_record(material)
    temporary_names = {state['imageNode'].name, state['emissionNode'].name}
    row['nodes'] = [contact_node_record(node) for node in sorted(material.node_tree.nodes, key=name_key)
                    if node.name not in temporary_names]
    row['links'] = sorted((link.from_node.name, link.from_socket.identifier,
                           link.to_node.name, link.to_socket.identifier)
                          for link in material.node_tree.links
                          if link.from_node.name not in temporary_names and link.to_node.name not in temporary_names)
    for old_source, old_target in state['surfaceLinks']:
        row['links'].append((old_source.node.name, old_source.identifier,
                             old_target.node.name, old_target.identifier))
    row['links'] = sorted(row['links'])
    row['activeNode'] = state['contactBefore']['activeNode']
    return row
