"""Prepared own Ivory isolated control fit. No external file IO, no render, no save. Root executes serially."""
import bpy
import json
import math
from mathutils import Vector

REFERENCE = {'sourceUid': 'e42fb924b344481ea013c58cb0f52ad7', 'sourceScene': 'PodRacing — source e42fb924b344481ea013c58cb0f52ad7 retry 20260908', 'targetScene': 'PodRacing — Blockrunner Ivory source copy V1 e42fb924b344481ea013c58cb0f52ad7', 'objectPrefix': 'Blockrunner Ivory source V1 ', 'sourceGlbSha256': '2ed231e15b8bbab3f7b7028b73e8b6f442d532c9bc4d1fc0a2f5c40aeda49576', 'auditReceiptSha256': 'f5375ba02bd017af32f833af96b2f7ccf4ab61d505acf754ee9ad48cae621079', 'normalSampleReceiptSha256': '6f0be7447392eb2779bd35b8b927ca013c7fd988a41904bf873423cd8f922e82', 'sourceSignature': {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic', 'materialsFnv1a64': {'lambert1.002': '39a62bfe6310aed6', 'pasted__LegoWhite1.001': '2e64e9defa8451f3', 'pasted__LegoWhite3.001': '8507f76fca6ddd6d', 'pasted__LegoWhite4': '3d89d9612d134265', 'pasted__Lego_White12': '61c3cde1e73fdc23', 'pasted__Lego_White15.001': 'cc1c8c6814734c3b', 'pasted__Lego_White16.001': 'a84aa217880d8448', 'pasted__Lego_White18.001': 'c920f6c29e05da32', 'pasted__Lego_White19': '87ea0c5daaef6bfc', 'pasted__Lego_White20.001': 'fa03cc6f64776ddf', 'pasted__Lego_White22.001': 'c6a0df6e6fc52d29', 'pasted__Lego_White23.001': 'e77bf9537e8200fc', 'pasted__Lego_White24.001': '978d2368e934a3c3', 'pasted__Lego_White25': '04e09d60b5e87461', 'pasted__Lego_White7': '76cd95d1071d3f47', 'pasted__Lego_White8.001': 'c78127755e46e687', 'pasted__Lego_White9': '797b1e38ec17184d', 'pasted__pasted__LegoWhite1.001': '1c47281497e31f0a', 'pasted__pasted__LegoWhite3.001': '6292f58165f7e5d4', 'pasted__pasted__LegoWhite4': 'e367d1fdbf915950', 'pasted__pasted__Lego_White12': '65c0a68a79d0864a', 'pasted__pasted__Lego_White14': 'afb5c1216e036660', 'pasted__pasted__Lego_White16': 'b574194203bfd176', 'pasted__pasted__Lego_White18.001': '4931bb430895948f', 'pasted__pasted__Lego_White19.001': 'c4e83d88ce6d4382', 'pasted__pasted__Lego_White20': '5e0afb69fc903595', 'pasted__pasted__Lego_White25': '112e2ef171bdb588', 'pasted__pasted__Lego_White26': '6f421e2e79609877', 'pasted__pasted__Lego_White7': '0f1bf1e9b9b4d060', 'pasted__pasted__Lego_White8.001': '2a5aba707de25aac', 'pasted__pasted__Lego_White9': '31316177c911cbe2', 'pasted__pasted__pasted__Lego_White12': 'af71a84e889e9d67', 'pasted__pasted__pasted__Lego_White14': '535226e03e64d705', 'pasted__pasted__pasted__Lego_White15': 'eb26c55ab6cc750c', 'pasted__pasted__pasted__Lego_White16': '8c145d3753906a0b', 'pasted__pasted__pasted__Lego_White19.001': '3abdff85446d74ab', 'pasted__pasted__pasted__Lego_White25': '811db75fc408463d', 'pasted__pasted__pasted__pasted__Lego_White11': '7569e043e0c7efc9', 'pasted__pasted__pasted__pasted__Lego_White14': '4033279429aaa464', 'pasted__pasted__pasted__pasted__Lego_White15': 'b9c1689d9fe118bd', 'pasted__pasted__pasted__pasted__Lego_White16': '98dc9b98715ef63a', 'pasted__pasted__pasted__pasted__Lego_White25': '23ca769892a5478c', 'pasted__pasted__pasted__pasted__pasted__Lego_White11': '46064cdbad001e1c', 'pasted__pasted__pasted__pasted__pasted__Lego_White14': '4788a24a9aa63e21', 'pasted__pasted__pasted__pasted__pasted__Lego_White25': '747bb148e6cb5019', 'pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '477dbedc856b0a60', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '308a2247cf35a815', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '6c2f978f47f305c4', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26': '08f0c8b969edc3e3', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '60c35fd95f6d4771', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': 'f5a85b024e41b778'}, 'meshesFnv1a64': {'pasted__L2x3slope2_lambert1_0': '67fd2da0bf899610', 'pasted__L2x3slope2_pasted__LegoWhite1_0': '0913fe471aab38a6', 'pasted__L2x3slope2_pasted__LegoWhite3_0': '2147053ec36150df', 'pasted__L2x3slope2_pasted__LegoWhite4_0': '6c54943ec1599bcf', 'pasted__L2x3slope2_pasted__Lego_White12_0': '4bc58ea5e07e402b', 'pasted__L2x3slope2_pasted__Lego_White15_0': '054b23f0390c35bc', 'pasted__L2x3slope2_pasted__Lego_White16_0': 'ba3fe5c1b4cda66b', 'pasted__L2x3slope2_pasted__Lego_White18_0': 'ca4f0fb8b724ab3a', 'pasted__L2x3slope2_pasted__Lego_White19_0': 'e0e99b3430e84def', 'pasted__L2x3slope2_pasted__Lego_White20_0': 'dfdebfc83f876639', 'pasted__L2x3slope2_pasted__Lego_White22_0': 'a46102c8c380ac59', 'pasted__L2x3slope2_pasted__Lego_White23_0': '0f3608e2c4f1ecaf', 'pasted__L2x3slope2_pasted__Lego_White24_0': 'd2cc9ea49baec9d2', 'pasted__L2x3slope2_pasted__Lego_White25_0': '73910da45f0c7ac8', 'pasted__L2x3slope2_pasted__Lego_White7_0': '66dc0b0d8f903183', 'pasted__L2x3slope2_pasted__Lego_White8_0': 'e175d00c1834b6e4', 'pasted__L2x3slope2_pasted__Lego_White9_0': 'e820f73c82c516e9', 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0': '457e2df12982e376', 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0': '09fecdd243b615f1', 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0': '8d6baceeb233ce01', 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0': '443aa3044b11ce8b', 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0': '0470bc9c2cfaba4c', 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0': 'b5d9ede588c2f8ca', 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0': '5ba68ea060f532ec', 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0': '3fec2e751cb62081', 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0': 'a16ff14611b568ce', 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0': '8409c6947be7442a', 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0': '3e919f3f632388ff', 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0': 'dab4923aa59bb602', 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0': '71c5d5ade6194ce2', 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0': '266d3218e39a3354', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0': 'b6578440a8140da2', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0': '21d1877c23258da2', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0': 'abd40576bac68ea5', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0': '3f3b391eb22b96d4', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0': 'c4d0baf996fd50d8', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0': '0bf68ff04cf9af46', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0': '9877a3550fda0c97', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0': '63299d1b7d4f9b1b', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0': '503a8ab530bd6d3e', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0': '5ee1187333e4da0b', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0': '8c4f094d2038718f', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0': 'e8e35853546b1c68', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0': 'e5fd963edf59dc7c', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0': 'e7b0ac45e95f5e2b', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '504ef0323110df24', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': 'b45eded8b4e3b95c', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '599350cac7c679f6', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0': '995865eabc386e88', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '3cf9a02a878823ed', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '89f840db8b0588af'}, 'objectsFnv1a64': '7a1811af8c772245'}, 'cornerNormals': {'pasted__L2x3slope2_lambert1_0': {'cornerCount': 28968, 'cornerNormalsFnv1a64': 'b966dd79e22d9b4b', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__LegoWhite1_0': {'cornerCount': 4836, 'cornerNormalsFnv1a64': 'b6e4a59d53cf16cb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__LegoWhite3_0': {'cornerCount': 720, 'cornerNormalsFnv1a64': '3c4611f43d131b62', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__LegoWhite4_0': {'cornerCount': 708, 'cornerNormalsFnv1a64': 'c6acda9b553f7f50', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White12_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '30fd8e2fbd6ac3f1', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White15_0': {'cornerCount': 1140, 'cornerNormalsFnv1a64': '2bd28b68c0f219bb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White16_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '48c4a2089ce59d32', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White18_0': {'cornerCount': 2808, 'cornerNormalsFnv1a64': '5e8016d53d249b24', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White19_0': {'cornerCount': 2124, 'cornerNormalsFnv1a64': '68d76bd040a410b5', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White20_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '9a7c9142501f5ad3', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White22_0': {'cornerCount': 1140, 'cornerNormalsFnv1a64': 'a938bf342b78f1c5', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White23_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '57a42388b8c1ac72', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White24_0': {'cornerCount': 780, 'cornerNormalsFnv1a64': '867378f1a2e047de', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '6e8340e0a8d7b263', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White7_0': {'cornerCount': 11304, 'cornerNormalsFnv1a64': '1bc2b25fe6fda29e', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White8_0': {'cornerCount': 6084, 'cornerNormalsFnv1a64': 'e7c1bf11c20f42a3', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White9_0': {'cornerCount': 2484, 'cornerNormalsFnv1a64': 'd8258ccb49f44781', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0': {'cornerCount': 4836, 'cornerNormalsFnv1a64': '738a4c877bc1c1bb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0': {'cornerCount': 720, 'cornerNormalsFnv1a64': '0be435c685b699d5', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0': {'cornerCount': 708, 'cornerNormalsFnv1a64': '6285dc0acca751b7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '2f51dd59fbb7a633', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '3540545055579095', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '93f3d637652fb360', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0': {'cornerCount': 2808, 'cornerNormalsFnv1a64': '1916c9a284f2e44c', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '450f96a01b8e4258', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0': {'cornerCount': 2124, 'cornerNormalsFnv1a64': '88beba74289eb6a7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': 'bfa4b452eb09c970', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '78fbc730085e047b', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0': {'cornerCount': 11304, 'cornerNormalsFnv1a64': 'ec9ca588cdad7e9f', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0': {'cornerCount': 6084, 'cornerNormalsFnv1a64': 'e8a229a1f9869693', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0': {'cornerCount': 2484, 'cornerNormalsFnv1a64': 'cdf95c6183b288b3', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '05747f312dc32c6b', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '6b7a6a04e6e116b7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': 'fee622d4ca983367', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '9f60ea1601dd1b34', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': 'a2760196a97ac3e8', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '68f62f84b51348e7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0': {'cornerCount': 11400, 'cornerNormalsFnv1a64': '38f8fa5dc75adedf', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': 'ec462f1146fa16fb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': 'c76f76fa963f7c08', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '4cd5f3504ca5166a', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '1c1d762c16c735f0', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0': {'cornerCount': 11400, 'cornerNormalsFnv1a64': '150898d7aa6fba1a', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': 'cebed9ab001b1914', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': 'c2c80fe85b8ea973', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '54fc201aa40668bc', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '3b6659f3ab5b3db1', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '2f02b88ff1aed378', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '10e1a71ac0ca2070', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '831c0924acc92bd1', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': 'd6fea65d2c0ff23f', 'hasCustomNormals': True}}, 'meshes': [{'name': 'pasted__L2x3slope2_lambert1_0', 'triangles': 9656, 'firstGlobalTriangle': 0, 'positionFnv': '3175e7c06687cdfd', 'uvFnv': 'e51f01c4085c0c6d', 'triangulationFnv': '7cacb2f008039a30'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'triangles': 3768, 'firstGlobalTriangle': 9656, 'positionFnv': 'a6ed690130cc67a1', 'uvFnv': 'f6de85f87c99ff57', 'triangulationFnv': '530e24661fb5b332'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White8_0', 'triangles': 2028, 'firstGlobalTriangle': 13424, 'positionFnv': '84b8ad3a7cb29361', 'uvFnv': '447604b6dee29631', 'triangulationFnv': 'fd50b8c0e840532f'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White9_0', 'triangles': 828, 'firstGlobalTriangle': 15452, 'positionFnv': '2401d6978d674e45', 'uvFnv': '34040b7d98e23ced', 'triangulationFnv': 'b167f7f4c6e65738'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White12_0', 'triangles': 348, 'firstGlobalTriangle': 16280, 'positionFnv': '159f5beb4e4312ab', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White15_0', 'triangles': 380, 'firstGlobalTriangle': 16628, 'positionFnv': 'ade52b17a633d74e', 'uvFnv': '6b2de35df9c8043c', 'triangulationFnv': 'e69c483134a21a7f'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White16_0', 'triangles': 348, 'firstGlobalTriangle': 17008, 'positionFnv': '2bc3fda0506951d0', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White18_0', 'triangles': 936, 'firstGlobalTriangle': 17356, 'positionFnv': '9ffc2ca5f04efa69', 'uvFnv': '8b0686d72214bc4d', 'triangulationFnv': '1514aac33c6e0751'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White19_0', 'triangles': 708, 'firstGlobalTriangle': 18292, 'positionFnv': '16157f5080bb8ac9', 'uvFnv': '5182e7414a0ca4bc', 'triangulationFnv': 'a92ddac239aaa2c6'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White20_0', 'triangles': 348, 'firstGlobalTriangle': 19000, 'positionFnv': 'a323a78b9700df88', 'uvFnv': '171a0db538516439', 'triangulationFnv': 'e02430107b3c8ddf'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White22_0', 'triangles': 380, 'firstGlobalTriangle': 19348, 'positionFnv': '2a9a018f07f18294', 'uvFnv': '6b2de35df9c8043c', 'triangulationFnv': 'e69c483134a21a7f'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White23_0', 'triangles': 228, 'firstGlobalTriangle': 19728, 'positionFnv': '9fbc54416b3cdc80', 'uvFnv': 'aec4ac9fe2e28c31', 'triangulationFnv': 'cda0e69bfc6530aa'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White24_0', 'triangles': 260, 'firstGlobalTriangle': 19956, 'positionFnv': '00992a77df80af10', 'uvFnv': '1c56e9b5a1ff2238', 'triangulationFnv': 'e3ea9a16ebeaa59b'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 20216, 'positionFnv': '9c157c041a6d1726', 'uvFnv': '825107a65a70810a', 'triangulationFnv': '96c21f7bb5b5bd7a'}, {'name': 'pasted__L2x3slope2_pasted__LegoWhite1_0', 'triangles': 1612, 'firstGlobalTriangle': 20576, 'positionFnv': '878729d9dd84a84e', 'uvFnv': '7425d5e5d9c53c26', 'triangulationFnv': '6d4bafb85aadcae4'}, {'name': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'triangles': 240, 'firstGlobalTriangle': 22188, 'positionFnv': 'a64282c3935f8927', 'uvFnv': 'a18dbab129d75563', 'triangulationFnv': '792c3c8dc6c53d31'}, {'name': 'pasted__L2x3slope2_pasted__LegoWhite4_0', 'triangles': 236, 'firstGlobalTriangle': 22428, 'positionFnv': '49f2d495855b5873', 'uvFnv': '48d694cea7b410e0', 'triangulationFnv': 'ff29c9f0441447e2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'triangles': 3768, 'firstGlobalTriangle': 22664, 'positionFnv': 'ad2877e7d427be59', 'uvFnv': 'f6de85f87c99ff57', 'triangulationFnv': '530e24661fb5b332'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'triangles': 2028, 'firstGlobalTriangle': 26432, 'positionFnv': '3450a8b64cbb105e', 'uvFnv': '447604b6dee29631', 'triangulationFnv': 'fd50b8c0e840532f'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'triangles': 828, 'firstGlobalTriangle': 28460, 'positionFnv': '133bf219711b3f95', 'uvFnv': '34040b7d98e23ced', 'triangulationFnv': 'b167f7f4c6e65738'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'triangles': 348, 'firstGlobalTriangle': 29288, 'positionFnv': '46896a989a381cd1', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'triangles': 228, 'firstGlobalTriangle': 29636, 'positionFnv': 'fefdd9d4782873ee', 'uvFnv': 'aec4ac9fe2e28c31', 'triangulationFnv': 'cda0e69bfc6530aa'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'triangles': 348, 'firstGlobalTriangle': 29864, 'positionFnv': '3ab272d0732c4828', 'uvFnv': '055dead886509797', 'triangulationFnv': '2b81619c2994acee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'triangles': 936, 'firstGlobalTriangle': 30212, 'positionFnv': 'a6b74afdfe96ee67', 'uvFnv': '8b0686d72214bc4d', 'triangulationFnv': 'e007883bd4c99087'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'triangles': 348, 'firstGlobalTriangle': 31148, 'positionFnv': 'a07283078503e886', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'triangles': 708, 'firstGlobalTriangle': 31496, 'positionFnv': '3a3c0ec80f82151c', 'uvFnv': 'd2ed647d3e91dfcc', 'triangulationFnv': 'fe70e15cd4dbcaab'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 32204, 'positionFnv': '495df6778bb09f49', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'b71082d836b2fbe0'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'triangles': 360, 'firstGlobalTriangle': 32564, 'positionFnv': '43c066015d96d363', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'db94ca32556a683b'}, {'name': 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'triangles': 1612, 'firstGlobalTriangle': 32924, 'positionFnv': 'f58e2020ad888210', 'uvFnv': '7425d5e5d9c53c26', 'triangulationFnv': '6d4bafb85aadcae4'}, {'name': 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'triangles': 240, 'firstGlobalTriangle': 34536, 'positionFnv': 'ec8a6eed41c4d62f', 'uvFnv': 'a18dbab129d75563', 'triangulationFnv': '792c3c8dc6c53d31'}, {'name': 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'triangles': 236, 'firstGlobalTriangle': 34776, 'positionFnv': 'c31a3a9ea2b0757b', 'uvFnv': '48d694cea7b410e0', 'triangulationFnv': 'ff29c9f0441447e2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'triangles': 348, 'firstGlobalTriangle': 35012, 'positionFnv': '017f0b32bcffde7b', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'triangles': 228, 'firstGlobalTriangle': 35360, 'positionFnv': 'fa3be8280ba9bf18', 'uvFnv': 'aec4ac9fe2e28c31', 'triangulationFnv': 'cda0e69bfc6530aa'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'triangles': 348, 'firstGlobalTriangle': 35588, 'positionFnv': '416c4d5773312fb9', 'uvFnv': '055dead886509797', 'triangulationFnv': '2b81619c2994acee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'triangles': 228, 'firstGlobalTriangle': 35936, 'positionFnv': '598179c540de7c62', 'uvFnv': '5cfd0b8d8109721b', 'triangulationFnv': 'f0cfe12ab1d18532'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'triangles': 348, 'firstGlobalTriangle': 36164, 'positionFnv': '453eefe4f01acf47', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 36512, 'positionFnv': '1995c55cfd43378f', 'uvFnv': '825107a65a70810a', 'triangulationFnv': '3efc0667143b6c2d'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'triangles': 3800, 'firstGlobalTriangle': 36872, 'positionFnv': 'b4a2893165c9d84d', 'uvFnv': 'c66f938a20b27161', 'triangulationFnv': '6ec0ff1106777dc0'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'triangles': 228, 'firstGlobalTriangle': 40672, 'positionFnv': 'f641062d61e60cc3', 'uvFnv': 'aec4ac9fe2e28c31', 'triangulationFnv': 'cda0e69bfc6530aa'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'triangles': 348, 'firstGlobalTriangle': 40900, 'positionFnv': 'd6d21774e511272d', 'uvFnv': '055dead886509797', 'triangulationFnv': '2b81619c2994acee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'triangles': 228, 'firstGlobalTriangle': 41248, 'positionFnv': '5bd496839c31568d', 'uvFnv': '5cfd0b8d8109721b', 'triangulationFnv': 'f0cfe12ab1d18532'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 41476, 'positionFnv': '621a921479e2fbe7', 'uvFnv': '825107a65a70810a', 'triangulationFnv': '55427ac654290825'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'triangles': 3800, 'firstGlobalTriangle': 41836, 'positionFnv': '2d65aac1abe685a5', 'uvFnv': 'ed8c607bbb0e40f3', 'triangulationFnv': 'ec8a344444263ed0'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'triangles': 228, 'firstGlobalTriangle': 45636, 'positionFnv': 'f9ff2c56e0a9dcb6', 'uvFnv': '5cfd0b8d8109721b', 'triangulationFnv': 'f0cfe12ab1d18532'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 45864, 'positionFnv': 'b08522bd0a91aa7c', 'uvFnv': '825107a65a70810a', 'triangulationFnv': '89afc3cc530484f3'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 46224, 'positionFnv': 'e454d31b9a6be79c', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 46584, 'positionFnv': '830c42ff17b57820', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 46944, 'positionFnv': 'faba58b161e8c09c', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'triangles': 360, 'firstGlobalTriangle': 47304, 'positionFnv': '9bc3eec300aabb0b', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 47664, 'positionFnv': 'd527f775543ce810', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 48024, 'positionFnv': '435e9adbf61f8e1d', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}]}
CLEANUP = {'sourceCopyScene': 'PodRacing — Blockrunner Ivory source copy V1 e42fb924b344481ea013c58cb0f52ad7', 'copyReceiptSha256': '62cb9bae25a53aac5fb2e6c0291fa4cab0d4107a3a6c6a354a9de4e782e03e10', 'inputsSha256': '8a0dc7a4f7bec7d8b48603d3ce508c9091e84fa4ecb4c7b79e3f8ea69883f25c', 'targetSourceObject': 'pasted__L2x3slope2_lambert1_0', 'targetSourceMesh': 'pasted__L2x3slope2_lambert1_0', 'targetCopyObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_lambert1_0', 'pairCount': 4828, 'pairsFnv': 'd1f9b1421c8d3801', 'roleRuns': {'helmet': [[2994, 192], [3202, 64], [3744, 392], [4216, 64], [4888, 64], [6342, 128], [6502, 64], [6738, 32], [6774, 64], [6858, 256], [7178, 160]], 'visor': [[2322, 44], [3478, 106], [4772, 116], [6276, 66], [6726, 12], [6770, 4], [6838, 20], [7402, 32]], 'gloves': [[1400, 456], [2290, 32], [5080, 32], [5552, 64], [6470, 32], [6566, 64], [6694, 32], [7434, 32], [7530, 360], [8000, 64], [8922, 64], [9514, 32], [9560, 96]], 'suit': [[1856, 434], [2366, 628], [3186, 16], [3266, 212], [3584, 160], [4136, 80], [4280, 492], [4952, 128], [5112, 440], [5616, 660], [6630, 64], [7114, 64], [7338, 64], [7466, 64], [7890, 110], [8064, 858], [8986, 528], [9546, 14]], 'body-remainder': [[0, 1400]]}, 'futureScene': 'PodRacing — Blockrunner Ivory exact opposing cleanup V1 e42fb924b344481ea013c58cb0f52ad7', 'futurePrefix': 'Blockrunner Ivory cleanup V1 ', 'copyObjects': [{'copiedObject': 'Blockrunner Ivory source V1 RootNode.017', 'copiedParent': 'Blockrunner Ivory source V1 eac2d5995b764e22b2b7b9ca17e830af.fbx', 'sourceObject': 'RootNode.017', 'sourceParent': 'eac2d5995b764e22b2b7b9ca17e830af.fbx'}, {'copiedObject': 'Blockrunner Ivory source V1 Sketchfab_model.040', 'copiedParent': None, 'sourceObject': 'Sketchfab_model.040', 'sourceParent': None}, {'copiedObject': 'Blockrunner Ivory source V1 eac2d5995b764e22b2b7b9ca17e830af.fbx', 'copiedParent': 'Blockrunner Ivory source V1 Sketchfab_model.040', 'sourceObject': 'eac2d5995b764e22b2b7b9ca17e830af.fbx', 'sourceParent': 'Sketchfab_model.040'}, {'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'copiedParent': 'Blockrunner Ivory source V1 RootNode.017', 'sourceObject': 'pasted__L2x3slope2', 'sourceParent': 'RootNode.017'}, {'actualTriangles': 9656, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_lambert1_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_lambert1_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_lambert1_0', 'sourceObject': 'pasted__L2x3slope2_lambert1_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 1612, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite1_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite1_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__LegoWhite1_0', 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite1_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 240, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite3_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite3_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 236, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite4_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite4_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__LegoWhite4_0', 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite4_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White12_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White12_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White12_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White12_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 380, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White15_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White15_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White15_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White15_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 936, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White18_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White18_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White18_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White18_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 708, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White19_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White19_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White19_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White19_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White20_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White20_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White20_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White20_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 380, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White22_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White22_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White22_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White22_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White23_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White23_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White23_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White23_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 260, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White24_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White24_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White24_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White24_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3768, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White7_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White7_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 2028, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White8_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White8_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White8_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White8_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 828, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White9_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White9_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White9_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White9_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 1612, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 240, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 236, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 936, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 708, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3768, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 2028, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 828, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3800, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3800, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}], 'copyMaterials': [{'copiedMaterial': 'Blockrunner Ivory source V1 lambert1.002', 'sourceMaterial': 'lambert1.002'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__LegoWhite1.001', 'sourceMaterial': 'pasted__LegoWhite1.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__LegoWhite3.001', 'sourceMaterial': 'pasted__LegoWhite3.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__LegoWhite4', 'sourceMaterial': 'pasted__LegoWhite4'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White12', 'sourceMaterial': 'pasted__Lego_White12'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White15.001', 'sourceMaterial': 'pasted__Lego_White15.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White16.001', 'sourceMaterial': 'pasted__Lego_White16.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White18.001', 'sourceMaterial': 'pasted__Lego_White18.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White19', 'sourceMaterial': 'pasted__Lego_White19'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White20.001', 'sourceMaterial': 'pasted__Lego_White20.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White22.001', 'sourceMaterial': 'pasted__Lego_White22.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White23.001', 'sourceMaterial': 'pasted__Lego_White23.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White24.001', 'sourceMaterial': 'pasted__Lego_White24.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White25', 'sourceMaterial': 'pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White7', 'sourceMaterial': 'pasted__Lego_White7'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White8.001', 'sourceMaterial': 'pasted__Lego_White8.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White9', 'sourceMaterial': 'pasted__Lego_White9'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__LegoWhite1.001', 'sourceMaterial': 'pasted__pasted__LegoWhite1.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__LegoWhite3.001', 'sourceMaterial': 'pasted__pasted__LegoWhite3.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__LegoWhite4', 'sourceMaterial': 'pasted__pasted__LegoWhite4'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White12', 'sourceMaterial': 'pasted__pasted__Lego_White12'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White16', 'sourceMaterial': 'pasted__pasted__Lego_White16'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White18.001', 'sourceMaterial': 'pasted__pasted__Lego_White18.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White19.001', 'sourceMaterial': 'pasted__pasted__Lego_White19.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White20', 'sourceMaterial': 'pasted__pasted__Lego_White20'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White26', 'sourceMaterial': 'pasted__pasted__Lego_White26'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White7', 'sourceMaterial': 'pasted__pasted__Lego_White7'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White8.001', 'sourceMaterial': 'pasted__pasted__Lego_White8.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White9', 'sourceMaterial': 'pasted__pasted__Lego_White9'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White12', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White12'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White15', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White15'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White16', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White16'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White19.001', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White19.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White11', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White11'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White15', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White15'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White16', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White16'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__Lego_White11', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__Lego_White11'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}]}
PROOF = {'normalReconstruction': {'actualEncodedNormalFnv1a64': '94e77cb785331160'}}
FIT = {'scene': 'PodRacing — Blockrunner Ivory fitted controls V1 e42fb924b344481ea013c58cb0f52ad7', 'prefix': 'Blockrunner Ivory fitted V1 ', 'cleanupReceiptSha256': '72f9efa252dcb233d7b95b484a8c9d766d42269bd7b250f59a8ec9040301c4e3', 'offlineReceiptSha256': '579394d46c8843de79a2bb7f20b66a5b0ff4d2d3c509669d50190a85b4f86b67', 'controls': [{'side': 'negativeX', 'sourceControl': 'pasted__L2x3slope2_pasted__LegoWhite4_0', 'wallSourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceControlTriangles': 236, 'originalBaseCenter': [-0.29828028726751654, 1.5398387200156094, 1.7679596769016115], 'originalLength': 1.1385558805371687, 'originalAxialLevels': [0.0, 0.011826, 1.126718, 1.138556], 'originalLowerBevelLength': 0.011826, 'originalUpperBevelLength': 0.01183788053716861, 'originalShaftRadius': 0.06558223389632803, 'gripBase': [-0.2860198946625962, 2.0076017553189622, 2.2424105629527133], 'gripTip': [-0.37506057956849714, 1.931748825916685, 2.5722864328380095], 'gripAxis': [-0.2544019568740031, -0.21672265543507793, 0.9425024853865618], 'gripLength': 0.3499999999999995, 'mountStart': [-0.28983592401570624, 2.004350915487436, 2.2565481002335117], 'mountEnd': [-1.4144287417171217, 2.004350915487436, 2.2565481002335117], 'mountRadius': 0.035, 'wallContact': [-1.4124287417171217, 2.004350915487436, 2.2565481002335117], 'wallSourcePolygon': 1810, 'wallThicknessAtAxis': 0.032752595316196675, 'wallEmbedDepth': 0.002, 'gripCapsuleClearances': {'testedTrianglesAfterAabbFilter': 381, 'searchScope': 'All43556 retained triangles considered by expanded capsule AABB; detailed distances within radius+0.1m only. Unreported surfaces are outside that AABB, not claimed exact global minima.', 'minimaWithinSearch': {'unintendedSurface': {'capsuleClearance': 0.04858127477584015, 'sourceObject': 'pasted__L2x3slope2_lambert1_0', 'sourcePolygon': 5070, 'role': 'body'}, 'intendedHand': {'capsuleClearance': 0.0028858931025810275, 'sourceObject': 'pasted__L2x3slope2_lambert1_0', 'sourcePolygon': 6622, 'role': 'glove-negativeX'}}}, 'mountCapsuleClearancesExcludingIntentionalWall': {'testedTrianglesAfterAabbFilter': 237, 'searchScope': 'All43556 retained triangles considered by expanded capsule AABB; detailed distances within radius+0.1m only. Unreported surfaces are outside that AABB, not claimed exact global minima.', 'minimaWithinSearch': {'unintendedSurface': {'capsuleClearance': 0.01575836409422105, 'sourceObject': 'pasted__L2x3slope2_lambert1_0', 'sourcePolygon': 9514, 'role': 'glove-negativeX'}}}, 'originalControlCapsuleContext': {'testedTrianglesAfterAabbFilter': 214, 'searchScope': 'All43556 retained triangles considered by expanded capsule AABB; detailed distances within radius+0.1m only. Unreported surfaces are outside that AABB, not claimed exact global minima.', 'minimaWithinSearch': {'unintendedSurface': {'capsuleClearance': -0.06558223389632803, 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'sourcePolygon': 6, 'role': 'body'}}}, 'profileEnvelopeChecks': [{'role': 'grip', 'bounds': [[-0.43516388607426815, 1.8710816349435642, 2.2245286291115947], [-0.22591375564072402, 2.068273275905524, 2.59016909012817]], 'allProfileVerticesInsideCapsule': True, 'completeProfileMaximumSegmentDistance': 0.0655822338963281, 'worldPositionsSha256': '62ce826507276195acdefc673fe1077ae8d07679967905c1384e006241d4f0c5'}, {'role': 'mount', 'bounds': [[-1.4144287417171217, 1.969637881700164, 2.2218350747728146], [-0.28983592401570624, 2.0390639492747082, 2.291261125694209]], 'allProfileVerticesInsideCapsule': True, 'completeProfileMaximumSegmentDistance': 0.03499999999999992, 'worldPositionsSha256': '7e82e3b5b0e6b50d59469aad62b8a7ea086d318556749895823d18cc3f4efa22'}], 'candidateOrigin': 'Prepared seed endpoints, now checked against own pinned GLB retained triangles; mount contact derived fresh from own sidewall. No original pose/beam transform changes.'}, {'side': 'positiveX', 'sourceControl': 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'wallSourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceControlTriangles': 236, 'originalBaseCenter': [0.39484766637451685, 1.5398387200156094, 1.7679596769016115], 'originalLength': 1.1385558805371687, 'originalAxialLevels': [0.0, 0.011826, 1.126718, 1.138556], 'originalLowerBevelLength': 0.011826, 'originalUpperBevelLength': 0.01183788053716861, 'originalShaftRadius': 0.06558223389632803, 'gripBase': [0.44399621757995505, 2.0108250526716454, 2.228780535421178], 'gripTip': [0.4472544454124614, 1.935921158312432, 2.5706559375214395], 'gripAxis': [0.009309222378589548, -0.21401112674060926, 0.9767868631436034], 'gripLength': 0.35000000000000026, 'mountStart': [0.44413585591563387, 2.0076148857705363, 2.243432338368332], 'mountEnd': [1.527211037124791, 2.0076148857705363, 2.243432338368332], 'mountRadius': 0.035, 'wallContact': [1.525211037124791, 2.0076148857705363, 2.243432338368332], 'wallSourcePolygon': 1811, 'wallThicknessAtAxis': 0.032752595316196675, 'wallEmbedDepth': 0.002, 'gripCapsuleClearances': {'testedTrianglesAfterAabbFilter': 381, 'searchScope': 'All43556 retained triangles considered by expanded capsule AABB; detailed distances within radius+0.1m only. Unreported surfaces are outside that AABB, not claimed exact global minima.', 'minimaWithinSearch': {'intendedHand': {'capsuleClearance': 0.0011960602479151178, 'sourceObject': 'pasted__L2x3slope2_lambert1_0', 'sourcePolygon': 1484, 'role': 'glove-positiveX'}, 'unintendedSurface': {'capsuleClearance': 0.051801764716782175, 'sourceObject': 'pasted__L2x3slope2_lambert1_0', 'sourcePolygon': 9056, 'role': 'body'}}}, 'mountCapsuleClearancesExcludingIntentionalWall': {'testedTrianglesAfterAabbFilter': 230, 'searchScope': 'All43556 retained triangles considered by expanded capsule AABB; detailed distances within radius+0.1m only. Unreported surfaces are outside that AABB, not claimed exact global minima.', 'minimaWithinSearch': {'unintendedSurface': {'capsuleClearance': 0.04393243725076934, 'sourceObject': 'pasted__L2x3slope2_lambert1_0', 'sourcePolygon': 1400, 'role': 'glove-positiveX'}}}, 'originalControlCapsuleContext': {'testedTrianglesAfterAabbFilter': 231, 'searchScope': 'All43556 retained triangles considered by expanded capsule AABB; detailed distances within radius+0.1m only. Unreported surfaces are outside that AABB, not claimed exact global minima.', 'minimaWithinSearch': {'unintendedSurface': {'capsuleClearance': -0.06558223389632803, 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'sourcePolygon': 5, 'role': 'body'}}}, 'profileEnvelopeChecks': [{'role': 'grip', 'bounds': [[0.37907308005435514, 1.8749101018010594, 2.2173561357580502], [0.5121746182306505, 2.071840073140353, 2.5820803371845673]], 'allProfileVerticesInsideCapsule': True, 'completeProfileMaximumSegmentDistance': 0.06558223389632815, 'worldPositionsSha256': 'e04f15b73d6f6cdfd2df7adda53275526c086fb1d9715430f5d29297b59e101e'}, {'role': 'mount', 'bounds': [[0.44413585591563387, 1.9729018519832642, 2.208719312907635], [1.527211037124791, 2.0423279195578083, 2.278145363829029]], 'allProfileVerticesInsideCapsule': True, 'completeProfileMaximumSegmentDistance': 0.03499999999999992, 'worldPositionsSha256': '7135d0e0331b8f375606c40c19bf4dd110098ae105ab7703464418c4428fc0e3'}], 'candidateOrigin': 'Prepared seed endpoints, now checked against own pinned GLB retained triangles; mount contact derived fresh from own sidewall. No original pose/beam transform changes.'}], 'cleanupObjects': [{'copiedObject': 'Blockrunner Ivory cleanup V1 RootNode.017', 'copiedParent': 'Blockrunner Ivory cleanup V1 eac2d5995b764e22b2b7b9ca17e830af.fbx', 'sourceObject': 'RootNode.017', 'sourceParent': 'eac2d5995b764e22b2b7b9ca17e830af.fbx'}, {'copiedObject': 'Blockrunner Ivory cleanup V1 Sketchfab_model.040', 'copiedParent': None, 'sourceObject': 'Sketchfab_model.040', 'sourceParent': None}, {'copiedObject': 'Blockrunner Ivory cleanup V1 eac2d5995b764e22b2b7b9ca17e830af.fbx', 'copiedParent': 'Blockrunner Ivory cleanup V1 Sketchfab_model.040', 'sourceObject': 'eac2d5995b764e22b2b7b9ca17e830af.fbx', 'sourceParent': 'Sketchfab_model.040'}, {'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'copiedParent': 'Blockrunner Ivory cleanup V1 RootNode.017', 'sourceObject': 'pasted__L2x3slope2', 'sourceParent': 'RootNode.017'}, {'actualTriangles': 4828, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_lambert1_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_lambert1_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_lambert1_0', 'sourceObject': 'pasted__L2x3slope2_lambert1_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 1612, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__LegoWhite1_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__LegoWhite1_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__LegoWhite1_0', 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite1_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 240, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__LegoWhite3_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__LegoWhite3_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 236, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__LegoWhite4_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__LegoWhite4_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__LegoWhite4_0', 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite4_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White12_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White12_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White12_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White12_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 380, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White15_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White15_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White15_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White15_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 936, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White18_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White18_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White18_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White18_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 708, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White19_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White19_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White19_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White19_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White20_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White20_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White20_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White20_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 380, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White22_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White22_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White22_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White22_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White23_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White23_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White23_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White23_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 260, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White24_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White24_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White24_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White24_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3768, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White7_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White7_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 2028, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White8_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White8_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White8_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White8_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 828, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White9_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__Lego_White9_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White9_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White9_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 1612, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 240, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 236, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 936, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 708, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3768, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 2028, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 828, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3800, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3800, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory cleanup V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}], 'cleanupMaterials': [{'copiedMaterial': 'Blockrunner Ivory cleanup V1 lambert1.002', 'sourceMaterial': 'lambert1.002'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__LegoWhite1.001', 'sourceMaterial': 'pasted__LegoWhite1.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__LegoWhite3.001', 'sourceMaterial': 'pasted__LegoWhite3.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__LegoWhite4', 'sourceMaterial': 'pasted__LegoWhite4'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White12', 'sourceMaterial': 'pasted__Lego_White12'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White15.001', 'sourceMaterial': 'pasted__Lego_White15.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White16.001', 'sourceMaterial': 'pasted__Lego_White16.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White18.001', 'sourceMaterial': 'pasted__Lego_White18.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White19', 'sourceMaterial': 'pasted__Lego_White19'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White20.001', 'sourceMaterial': 'pasted__Lego_White20.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White22.001', 'sourceMaterial': 'pasted__Lego_White22.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White23.001', 'sourceMaterial': 'pasted__Lego_White23.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White24.001', 'sourceMaterial': 'pasted__Lego_White24.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White25', 'sourceMaterial': 'pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White7', 'sourceMaterial': 'pasted__Lego_White7'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White8.001', 'sourceMaterial': 'pasted__Lego_White8.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__Lego_White9', 'sourceMaterial': 'pasted__Lego_White9'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__LegoWhite1.001', 'sourceMaterial': 'pasted__pasted__LegoWhite1.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__LegoWhite3.001', 'sourceMaterial': 'pasted__pasted__LegoWhite3.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__LegoWhite4', 'sourceMaterial': 'pasted__pasted__LegoWhite4'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White12', 'sourceMaterial': 'pasted__pasted__Lego_White12'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White16', 'sourceMaterial': 'pasted__pasted__Lego_White16'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White18.001', 'sourceMaterial': 'pasted__pasted__Lego_White18.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White19.001', 'sourceMaterial': 'pasted__pasted__Lego_White19.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White20', 'sourceMaterial': 'pasted__pasted__Lego_White20'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White26', 'sourceMaterial': 'pasted__pasted__Lego_White26'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White7', 'sourceMaterial': 'pasted__pasted__Lego_White7'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White8.001', 'sourceMaterial': 'pasted__pasted__Lego_White8.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__Lego_White9', 'sourceMaterial': 'pasted__pasted__Lego_White9'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__Lego_White12', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White12'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__Lego_White15', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White15'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__Lego_White16', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White16'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__Lego_White19.001', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White19.001'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__Lego_White11', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White11'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__Lego_White15', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White15'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__Lego_White16', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White16'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__pasted__Lego_White11', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__Lego_White11'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory cleanup V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}], 'cleanupSignatures': {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic', 'materialsFnv1a64': {'lambert1.002': '39a62bfe6310aed6', 'pasted__LegoWhite1.001': '2e64e9defa8451f3', 'pasted__LegoWhite3.001': '8507f76fca6ddd6d', 'pasted__LegoWhite4': '3d89d9612d134265', 'pasted__Lego_White12': '61c3cde1e73fdc23', 'pasted__Lego_White15.001': 'cc1c8c6814734c3b', 'pasted__Lego_White16.001': 'a84aa217880d8448', 'pasted__Lego_White18.001': 'c920f6c29e05da32', 'pasted__Lego_White19': '87ea0c5daaef6bfc', 'pasted__Lego_White20.001': 'fa03cc6f64776ddf', 'pasted__Lego_White22.001': 'c6a0df6e6fc52d29', 'pasted__Lego_White23.001': 'e77bf9537e8200fc', 'pasted__Lego_White24.001': '978d2368e934a3c3', 'pasted__Lego_White25': '04e09d60b5e87461', 'pasted__Lego_White7': '76cd95d1071d3f47', 'pasted__Lego_White8.001': 'c78127755e46e687', 'pasted__Lego_White9': '797b1e38ec17184d', 'pasted__pasted__LegoWhite1.001': '1c47281497e31f0a', 'pasted__pasted__LegoWhite3.001': '6292f58165f7e5d4', 'pasted__pasted__LegoWhite4': 'e367d1fdbf915950', 'pasted__pasted__Lego_White12': '65c0a68a79d0864a', 'pasted__pasted__Lego_White14': 'afb5c1216e036660', 'pasted__pasted__Lego_White16': 'b574194203bfd176', 'pasted__pasted__Lego_White18.001': '4931bb430895948f', 'pasted__pasted__Lego_White19.001': 'c4e83d88ce6d4382', 'pasted__pasted__Lego_White20': '5e0afb69fc903595', 'pasted__pasted__Lego_White25': '112e2ef171bdb588', 'pasted__pasted__Lego_White26': '6f421e2e79609877', 'pasted__pasted__Lego_White7': '0f1bf1e9b9b4d060', 'pasted__pasted__Lego_White8.001': '2a5aba707de25aac', 'pasted__pasted__Lego_White9': '31316177c911cbe2', 'pasted__pasted__pasted__Lego_White12': 'af71a84e889e9d67', 'pasted__pasted__pasted__Lego_White14': '535226e03e64d705', 'pasted__pasted__pasted__Lego_White15': 'eb26c55ab6cc750c', 'pasted__pasted__pasted__Lego_White16': '8c145d3753906a0b', 'pasted__pasted__pasted__Lego_White19.001': '3abdff85446d74ab', 'pasted__pasted__pasted__Lego_White25': '811db75fc408463d', 'pasted__pasted__pasted__pasted__Lego_White11': '7569e043e0c7efc9', 'pasted__pasted__pasted__pasted__Lego_White14': '4033279429aaa464', 'pasted__pasted__pasted__pasted__Lego_White15': 'b9c1689d9fe118bd', 'pasted__pasted__pasted__pasted__Lego_White16': '98dc9b98715ef63a', 'pasted__pasted__pasted__pasted__Lego_White25': '23ca769892a5478c', 'pasted__pasted__pasted__pasted__pasted__Lego_White11': '46064cdbad001e1c', 'pasted__pasted__pasted__pasted__pasted__Lego_White14': '4788a24a9aa63e21', 'pasted__pasted__pasted__pasted__pasted__Lego_White25': '747bb148e6cb5019', 'pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '477dbedc856b0a60', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '308a2247cf35a815', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '6c2f978f47f305c4', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26': '08f0c8b969edc3e3', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '60c35fd95f6d4771', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': 'f5a85b024e41b778'}, 'meshesFnv1a64': {'pasted__L2x3slope2_lambert1_0': 'af295296718bc2ca', 'pasted__L2x3slope2_pasted__LegoWhite1_0': '0913fe471aab38a6', 'pasted__L2x3slope2_pasted__LegoWhite3_0': '2147053ec36150df', 'pasted__L2x3slope2_pasted__LegoWhite4_0': '6c54943ec1599bcf', 'pasted__L2x3slope2_pasted__Lego_White12_0': '4bc58ea5e07e402b', 'pasted__L2x3slope2_pasted__Lego_White15_0': '054b23f0390c35bc', 'pasted__L2x3slope2_pasted__Lego_White16_0': 'ba3fe5c1b4cda66b', 'pasted__L2x3slope2_pasted__Lego_White18_0': 'ca4f0fb8b724ab3a', 'pasted__L2x3slope2_pasted__Lego_White19_0': 'e0e99b3430e84def', 'pasted__L2x3slope2_pasted__Lego_White20_0': 'dfdebfc83f876639', 'pasted__L2x3slope2_pasted__Lego_White22_0': 'a46102c8c380ac59', 'pasted__L2x3slope2_pasted__Lego_White23_0': '0f3608e2c4f1ecaf', 'pasted__L2x3slope2_pasted__Lego_White24_0': 'd2cc9ea49baec9d2', 'pasted__L2x3slope2_pasted__Lego_White25_0': '73910da45f0c7ac8', 'pasted__L2x3slope2_pasted__Lego_White7_0': '66dc0b0d8f903183', 'pasted__L2x3slope2_pasted__Lego_White8_0': 'e175d00c1834b6e4', 'pasted__L2x3slope2_pasted__Lego_White9_0': 'e820f73c82c516e9', 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0': '457e2df12982e376', 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0': '09fecdd243b615f1', 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0': '8d6baceeb233ce01', 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0': '443aa3044b11ce8b', 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0': '0470bc9c2cfaba4c', 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0': 'b5d9ede588c2f8ca', 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0': '5ba68ea060f532ec', 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0': '3fec2e751cb62081', 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0': 'a16ff14611b568ce', 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0': '8409c6947be7442a', 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0': '3e919f3f632388ff', 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0': 'dab4923aa59bb602', 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0': '71c5d5ade6194ce2', 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0': '266d3218e39a3354', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0': 'b6578440a8140da2', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0': '21d1877c23258da2', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0': 'abd40576bac68ea5', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0': '3f3b391eb22b96d4', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0': 'c4d0baf996fd50d8', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0': '0bf68ff04cf9af46', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0': '9877a3550fda0c97', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0': '63299d1b7d4f9b1b', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0': '503a8ab530bd6d3e', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0': '5ee1187333e4da0b', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0': '8c4f094d2038718f', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0': 'e8e35853546b1c68', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0': 'e5fd963edf59dc7c', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0': 'e7b0ac45e95f5e2b', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '504ef0323110df24', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': 'b45eded8b4e3b95c', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '599350cac7c679f6', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0': '995865eabc386e88', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '3cf9a02a878823ed', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '89f840db8b0588af'}, 'objectsFnv1a64': '7a1811af8c772245'}, 'cleanupNormals': {'pasted__L2x3slope2_lambert1_0': {'cornerCount': 14484, 'cornerNormalsFnv1a64': '94e77cb785331160', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__LegoWhite1_0': {'cornerCount': 4836, 'cornerNormalsFnv1a64': 'b6e4a59d53cf16cb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__LegoWhite3_0': {'cornerCount': 720, 'cornerNormalsFnv1a64': '3c4611f43d131b62', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__LegoWhite4_0': {'cornerCount': 708, 'cornerNormalsFnv1a64': 'c6acda9b553f7f50', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White12_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '30fd8e2fbd6ac3f1', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White15_0': {'cornerCount': 1140, 'cornerNormalsFnv1a64': '2bd28b68c0f219bb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White16_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '48c4a2089ce59d32', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White18_0': {'cornerCount': 2808, 'cornerNormalsFnv1a64': '5e8016d53d249b24', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White19_0': {'cornerCount': 2124, 'cornerNormalsFnv1a64': '68d76bd040a410b5', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White20_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '9a7c9142501f5ad3', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White22_0': {'cornerCount': 1140, 'cornerNormalsFnv1a64': 'a938bf342b78f1c5', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White23_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '57a42388b8c1ac72', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White24_0': {'cornerCount': 780, 'cornerNormalsFnv1a64': '867378f1a2e047de', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '6e8340e0a8d7b263', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White7_0': {'cornerCount': 11304, 'cornerNormalsFnv1a64': '1bc2b25fe6fda29e', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White8_0': {'cornerCount': 6084, 'cornerNormalsFnv1a64': 'e7c1bf11c20f42a3', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White9_0': {'cornerCount': 2484, 'cornerNormalsFnv1a64': 'd8258ccb49f44781', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0': {'cornerCount': 4836, 'cornerNormalsFnv1a64': '738a4c877bc1c1bb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0': {'cornerCount': 720, 'cornerNormalsFnv1a64': '0be435c685b699d5', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0': {'cornerCount': 708, 'cornerNormalsFnv1a64': '6285dc0acca751b7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '2f51dd59fbb7a633', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '3540545055579095', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '93f3d637652fb360', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0': {'cornerCount': 2808, 'cornerNormalsFnv1a64': '1916c9a284f2e44c', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '450f96a01b8e4258', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0': {'cornerCount': 2124, 'cornerNormalsFnv1a64': '88beba74289eb6a7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': 'bfa4b452eb09c970', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '78fbc730085e047b', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0': {'cornerCount': 11304, 'cornerNormalsFnv1a64': 'ec9ca588cdad7e9f', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0': {'cornerCount': 6084, 'cornerNormalsFnv1a64': 'e8a229a1f9869693', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0': {'cornerCount': 2484, 'cornerNormalsFnv1a64': 'cdf95c6183b288b3', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '05747f312dc32c6b', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '6b7a6a04e6e116b7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': 'fee622d4ca983367', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '9f60ea1601dd1b34', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': 'a2760196a97ac3e8', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '68f62f84b51348e7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0': {'cornerCount': 11400, 'cornerNormalsFnv1a64': '38f8fa5dc75adedf', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': 'ec462f1146fa16fb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': 'c76f76fa963f7c08', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '4cd5f3504ca5166a', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '1c1d762c16c735f0', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0': {'cornerCount': 11400, 'cornerNormalsFnv1a64': '150898d7aa6fba1a', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': 'cebed9ab001b1914', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': 'c2c80fe85b8ea973', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '54fc201aa40668bc', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '3b6659f3ab5b3db1', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '2f02b88ff1aed378', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '10e1a71ac0ca2070', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '831c0924acc92bd1', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': 'd6fea65d2c0ff23f', 'hasCustomNormals': True}}, 'gloveCleanedRuns': [[700, 228], [1145, 16], [2540, 16], [2776, 32], [3235, 16], [3283, 32], [3347, 16], [3717, 16], [3765, 180], [4000, 32], [4461, 32], [4757, 16], [4780, 48]], 'offlineLiveWorldAgreementMetres': 1e-05}

def fnv1a64_signature(value):
    # Non-cryptographic JSON signature. ASCII escaping and separators are
    # pinned identically to the externally prepared hierarchy reference.
    serialized = json.dumps(value, sort_keys=True, separators=(',', ':'),
                            allow_nan=False, ensure_ascii=True)
    signature = 14695981039346656037
    for character in serialized:
        signature = ((signature ^ ord(character)) * 1099511628211) & 18446744073709551615
    return format(signature, '016x')


def name_key(item):
    return item.name


def matrix_rows(matrix):
    return [list(row) for row in matrix]


def mesh_signature(mesh):
    # Non-cryptographic numeric signatures compare same-session structure,
    # never presented as byte equality between a Blender mesh and a GLB.
    return fnv1a64_signature({
        'vertices': [list(v.co) for v in mesh.vertices],
        'edges': [list(e.vertices) for e in mesh.edges],
        'polygons': [(list(p.vertices), p.material_index, p.use_smooth)
                     for p in mesh.polygons],
        'uv': [(layer.name, [list(item.uv) for item in layer.data])
               for layer in mesh.uv_layers],
        'materials': [m.name if m else None for m in mesh.materials],
        'shapeKeys': mesh.shape_keys.name if mesh.shape_keys else None,
        'attributes': [(a.name, a.data_type, a.domain, len(a.data))
                       for a in mesh.attributes],
    })


def socket_value(socket):
    if not hasattr(socket, 'default_value'):
        return None
    value = socket.default_value
    if isinstance(value, (str, bool, int, float)):
        return value
    try:
        return list(value)
    except TypeError:
        return str(value)


def material_record(material):
    record = {'name': material.name, 'diffuseColor': list(material.diffuse_color),
              'useNodes': material.use_nodes,
              'roughness': material.roughness, 'metallic': material.metallic,
              'useBackfaceCulling': material.use_backface_culling,
              'nodes': [], 'links': []}
    if material.use_nodes and material.node_tree:
        for node in sorted(material.node_tree.nodes, key=name_key):
            row = {'name': node.name, 'type': node.bl_idname,
                   'inputs': [(s.name, socket_value(s)) for s in node.inputs]}
            if hasattr(node, 'image'):
                row['image'] = node.image.name if node.image else None
            record['nodes'].append(row)
        record['links'] = sorted((l.from_node.name, l.from_socket.name,
                                  l.to_node.name, l.to_socket.name)
                                 for l in material.node_tree.links)
    return record


def source_signature(source):
    rows = []
    meshes = {}
    materials = {}
    for ob in sorted(source.objects, key=name_key):
        rows.append({'name': ob.name, 'type': ob.type,
                     'parent': ob.parent.name if ob.parent else None,
                     'matrixLocal': matrix_rows(ob.matrix_local),
                     'matrixWorld': matrix_rows(ob.matrix_world),
                     'data': ob.data.name if ob.data else None,
                     'hideRender': ob.hide_render,
                     'hideViewport': ob.hide_viewport,
                     'materials': [(s.link, s.material.name if s.material else None)
                                   for s in ob.material_slots]})
        if ob.type == 'MESH':
            meshes[ob.data.name] = mesh_signature(ob.data)
            for slot in ob.material_slots:
                if slot.material:
                    materials[slot.material.name] = material_record(slot.material)
    return {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic',
            'objectsFnv1a64': fnv1a64_signature(rows), 'meshesFnv1a64': meshes,
            'materialsFnv1a64': {name: fnv1a64_signature(row) for name, row in materials.items()}}


def normal_signatures(source):
    return {ob.name: {'cornerCount': len(ob.data.corner_normals),
                      'cornerNormalsFnv1a64': fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals]),
                      'hasCustomNormals': ob.data.has_custom_normals}
            for ob in sorted(source.objects, key=name_key) if ob.type == 'MESH'}


def context_record(window):
    layer = window.view_layer
    return {'scene': window.scene.name, 'viewLayer': layer.name,
            'activeObject': layer.objects.active.name if layer.objects.active else None,
            'selectedObjects': sorted(ob.name for ob in layer.objects if ob.select_get(view_layer=layer)),
            'mode': bpy.context.mode}


def render_record(scene):
    render = scene.render
    record = {'engine': render.engine, 'resolution': [render.resolution_x, render.resolution_y, render.resolution_percentage],
              'pixelAspect': [render.pixel_aspect_x, render.pixel_aspect_y],
              'filmTransparent': render.film_transparent, 'filepath': render.filepath,
              'border': [render.use_border, render.use_crop_to_border, render.border_min_x, render.border_min_y, render.border_max_x, render.border_max_y],
              'image': [render.image_settings.file_format, render.image_settings.color_mode, render.image_settings.color_depth],
              'color': [scene.view_settings.view_transform, scene.view_settings.look, scene.view_settings.exposure, scene.view_settings.gamma],
              'fps': [render.fps, render.fps_base]}
    if hasattr(scene, 'cycles'):
        record['cycles'] = [scene.cycles.device, scene.cycles.samples, scene.cycles.use_denoising]
    return record


def scene_record(scene):
    return {'name': scene.name, 'objects': sorted(ob.name for ob in scene.objects),
            'masterObjects': sorted(ob.name for ob in scene.collection.objects),
            'masterChildren': sorted(c.name for c in scene.collection.children),
            'frame': [scene.frame_current, scene.frame_subframe, scene.frame_start, scene.frame_end],
            'camera': scene.camera.name if scene.camera else None,
            'world': scene.world.name if scene.world else None,
            'cursorMatrix': matrix_rows(scene.cursor.matrix), 'render': render_record(scene),
            'layers': [{'name': layer.name, 'active': layer.objects.active.name if layer.objects.active else None,
                        'selected': sorted(ob.name for ob in layer.objects if ob.select_get(view_layer=layer))}
                       for layer in scene.view_layers]}


def collection_record(collection):
    return {'name': collection.name, 'objects': sorted(ob.name for ob in collection.objects),
            'children': sorted(c.name for c in collection.children),
            'hideRender': collection.hide_render, 'hideViewport': collection.hide_viewport}


def datablock_sets():
    return {
        'scenes': set(bpy.data.scenes),
        'collections': set(bpy.data.collections),
        'objects': set(bpy.data.objects),
        'meshes': set(bpy.data.meshes),
        'materials': set(bpy.data.materials),
        'images': set(bpy.data.images),
        'worlds': set(bpy.data.worlds),
        'cameras': set(bpy.data.cameras),
        'lights': set(bpy.data.lights),
        'curves': set(bpy.data.curves),
        'actions': set(bpy.data.actions),
        'node_groups': set(bpy.data.node_groups),
    }


def fresh_snapshot():
    window = bpy.context.window
    assert window is not None, 'Existing interactive Blender window required.'
    layer = window.view_layer
    sets = datablock_sets()
    return {'window': window, 'scene': window.scene, 'layer': layer, 'active': layer.objects.active,
            'selected': set(ob for ob in layer.objects if ob.select_get(view_layer=layer)),
            'context': context_record(window), 'sets': sets,
            'scenes': {scene: scene_record(scene) for scene in bpy.data.scenes},
            'collections': {collection: collection_record(collection) for collection in bpy.data.collections}}


def restore_original_context(snapshot):
    window = snapshot['window']
    if window.scene != snapshot['scene']:
        window.scene = snapshot['scene']
    if window.view_layer != snapshot['layer']:
        window.view_layer = snapshot['layer']
    layer = snapshot['layer']
    selected = set(ob for ob in layer.objects if ob.select_get(view_layer=layer))
    if selected != snapshot['selected']:
        for ob in layer.objects:
            desired = ob in snapshot['selected']
            if ob.select_get(view_layer=layer) != desired:
                ob.select_set(desired, view_layer=layer)
    if layer.objects.active != snapshot['active']:
        layer.objects.active = snapshot['active']
    assert context_record(window) == snapshot['context'], 'Original scene/layer/active/selection/mode not restored.'


def mesh_signature_remapped(mesh, material_names):
    # Non-cryptographic numeric signatures compare same-session structure,
    # never presented as byte equality between a Blender mesh and a GLB.
    return fnv1a64_signature({
        'vertices': [list(v.co) for v in mesh.vertices],
        'edges': [list(e.vertices) for e in mesh.edges],
        'polygons': [(list(p.vertices), p.material_index, p.use_smooth)
                     for p in mesh.polygons],
        'uv': [(layer.name, [list(item.uv) for item in layer.data])
               for layer in mesh.uv_layers],
        'materials': [material_names[m] if m else None for m in mesh.materials],
        'shapeKeys': mesh.shape_keys.name if mesh.shape_keys else None,
        'attributes': [(a.name, a.data_type, a.domain, len(a.data))
                       for a in mesh.attributes],
    })


def require_source(source):
    assert len(source.objects) == 55, 'Ivory source object count differs.'
    assert sum(ob.type == 'MESH' for ob in source.objects) == 51, 'Ivory source mesh count differs.'
    assert len(set(ob.data for ob in source.objects if ob.type == 'MESH')) == 51, 'Ivory source mesh sharing differs.'
    assert source_signature(source) == REFERENCE['sourceSignature'], 'Ivory source differs from its own executed audit.'
    assert normal_signatures(source) == REFERENCE['cornerNormals'], 'Ivory raw corner normals differ from its own executed audit.'
    for ob in source.objects:
        assert ob.type in {'MESH', 'EMPTY'}, ('Unexpected source object type', ob.name)
        assert ob.parent is None or ob.parent in set(source.objects), ('External parent', ob.name)
        assert ob.animation_data is None and len(ob.constraints) == 0 and len(ob.modifiers) == 0, ('Unexpected source animation/constraint/modifier', ob.name)
        assert ob.instance_type == 'NONE', ('Unexpected source instance', ob.name)
        if ob.type == 'EMPTY':
            assert ob.data is None, ('Unexpected empty data', ob.name)
        else:
            assert ob.data.shape_keys is None and ob.data.animation_data is None, ('Unexpected mesh animation/shape keys', ob.name)
            for slot in ob.material_slots:
                assert slot.link == 'DATA' and slot.material is not None, ('Unsupported source material slot', ob.name)
                assert slot.material.animation_data is None, ('Unexpected material animation', slot.material.name)
                if slot.material.node_tree:
                    assert slot.material.node_tree.animation_data is None, ('Unexpected material node animation', slot.material.name)
                    for node in slot.material.node_tree.nodes:
                        assert node.bl_idname != 'ShaderNodeGroup', ('External shader group requires a separate copy plan', slot.material.name)
                        if hasattr(node, 'image'):
                            assert node.image is None, ('Unexpected source image requires a separate copy plan', slot.material.name)


def copy_parity(source, stage, object_map, mesh_map, material_map):
    reverse_objects = {copied: original for original, copied in object_map.items()}
    reverse_meshes = {copied: original for original, copied in mesh_map.items()}
    material_names = {copied: original.name for original, copied in material_map.items()}
    assert set(stage.objects) == set(object_map.values()), 'Copied scene has unexpected object members.'
    assert set(stage.collection.objects) == set(object_map.values()) and len(stage.collection.children) == 0, 'Copied scene root membership differs.'
    assert not set(object_map.values()).intersection(set(source.objects)), 'Copied objects alias original objects.'
    assert not set(mesh_map.values()).intersection(set(mesh_map.keys())), 'Copied meshes alias originals.'
    assert not set(material_map.values()).intersection(set(material_map.keys())), 'Copied materials alias originals.'
    object_rows = []
    mesh_signatures = {}
    material_signatures = {}
    corner_signatures = {}
    lineage = []
    for original in sorted(source.objects, key=name_key):
        copied = object_map[original]
        assert copied.name == REFERENCE['objectPrefix'] + original.name, ('Copied object name differs', original.name)
        assert set(copied.users_collection) == {stage.collection}, ('Copy escaped isolated scene collection', copied.name)
        assert copied.parent == (object_map[original.parent] if original.parent else None), ('Copied parent differs', original.name)
        assert copied.parent_type == original.parent_type and copied.parent_bone == original.parent_bone, ('Parent binding differs', original.name)
        assert matrix_rows(copied.matrix_parent_inverse) == matrix_rows(original.matrix_parent_inverse), ('Parent inverse differs', original.name)
        assert matrix_rows(copied.matrix_basis) == matrix_rows(original.matrix_basis), ('Transform basis differs', original.name)
        assert copied.rotation_mode == original.rotation_mode, ('Rotation mode differs', original.name)
        assert list(copied.location) == list(original.location) and list(copied.scale) == list(original.scale), ('Local position/scale differs', original.name)
        assert list(copied.rotation_euler) == list(original.rotation_euler) and list(copied.rotation_quaternion) == list(original.rotation_quaternion) and list(copied.rotation_axis_angle) == list(original.rotation_axis_angle), ('Stored rotation differs', original.name)
        assert list(copied.delta_location) == list(original.delta_location) and list(copied.delta_scale) == list(original.delta_scale) and list(copied.delta_rotation_euler) == list(original.delta_rotation_euler) and list(copied.delta_rotation_quaternion) == list(original.delta_rotation_quaternion), ('Delta transform differs', original.name)
        object_rows.append({'name': original.name, 'type': copied.type,
                            'parent': reverse_objects[copied.parent].name if copied.parent else None,
                            'matrixLocal': matrix_rows(copied.matrix_local), 'matrixWorld': matrix_rows(copied.matrix_world),
                            'data': reverse_meshes[copied.data].name if copied.data else None,
                            'hideRender': copied.hide_render, 'hideViewport': copied.hide_viewport,
                            'materials': [(slot.link, material_names[slot.material] if slot.material else None) for slot in copied.material_slots]})
        row = {'sourceObject': original.name, 'copiedObject': copied.name,
               'sourceParent': original.parent.name if original.parent else None,
               'copiedParent': copied.parent.name if copied.parent else None}
        if original.type == 'MESH':
            assert copied.data is mesh_map[original.data], ('Copied mesh binding differs', original.name)
            mesh_signatures[original.data.name] = mesh_signature_remapped(copied.data, material_names)
            corner_signatures[original.name] = {'cornerCount': len(copied.data.corner_normals),
                                                'cornerNormalsFnv1a64': fnv1a64_signature([list(n.vector) for n in copied.data.corner_normals]),
                                                'hasCustomNormals': copied.data.has_custom_normals}
            assert len(copied.data.polygons) == len(original.data.polygons), ('Copied polygon count differs', original.name)
            row['sourceMesh'] = original.data.name
            row['copiedMesh'] = copied.data.name
            row['actualTriangles'] = len(copied.data.polygons)
        lineage.append(row)
    for original, copied in material_map.items():
        assert copied.name == REFERENCE['objectPrefix'] + original.name, ('Copied material name differs', original.name)
        if original.node_tree:
            assert copied.node_tree is not original.node_tree, ('Copied material shares embedded node tree', original.name)
        record = material_record(copied)
        record['name'] = original.name
        material_signatures[original.name] = fnv1a64_signature(record)
    signatures = {'algorithm': REFERENCE['sourceSignature']['algorithm'],
                  'objectsFnv1a64': fnv1a64_signature(object_rows), 'meshesFnv1a64': mesh_signatures,
                  'materialsFnv1a64': material_signatures}
    assert signatures == REFERENCE['sourceSignature'], 'Copy differs from own source after normalizing deliberate copied ID names.'
    assert corner_signatures == REFERENCE['cornerNormals'], 'Copied raw corner normals differ; no recalculation or setter is allowed.'
    assert len(object_map) == 55 and len(mesh_map) == 51 and len(material_map) == 51, 'Copy cardinality differs.'
    assert sum(row.get('actualTriangles', 0) for row in lineage) == 48384, 'Copied triangle total differs.'
    return {'copyPassed': True, 'sourceNameNormalizedSignatures': signatures,
            'rawCornerNormalSignatures': corner_signatures, 'objectLineage': lineage,
            'materialLineage': [{'sourceMaterial': original.name, 'copiedMaterial': copied.name} for original, copied in material_map.items()],
            'objects': 55, 'uniqueMeshes': 51, 'materials': 51, 'actualTriangles': 48384,
            'scope': 'Exact measured source geometry/topology/UV/slot/material/transform/hierarchy and raw corner-normal FNV parity after only copied ID names are normalized. Not every undocumented Blender property or raw file bytes.'}


def cleanup_parity(source, stage, object_map, mesh_map, material_map):
    reverse_objects = {copied: original for original, copied in object_map.items()}
    reverse_meshes = {copied: original for original, copied in mesh_map.items()}
    material_names = {copied: original.name for original, copied in material_map.items()}
    assert set(stage.objects) == set(object_map.values()), 'Copied scene has unexpected object members.'
    assert set(stage.collection.objects) == set(object_map.values()) and len(stage.collection.children) == 0, 'Copied scene root membership differs.'
    assert not set(object_map.values()).intersection(set(source.objects)), 'Copied objects alias original objects.'
    assert not set(mesh_map.values()).intersection(set(mesh_map.keys())), 'Copied meshes alias originals.'
    assert not set(material_map.values()).intersection(set(material_map.keys())), 'Copied materials alias originals.'
    object_rows = []
    mesh_signatures = {}
    material_signatures = {}
    corner_signatures = {}
    lineage = []
    for original in sorted(source.objects, key=name_key):
        copied = object_map[original]
        assert copied.name == CLEANUP['futurePrefix'] + original.name, ('Copied object name differs', original.name)
        assert set(copied.users_collection) == {stage.collection}, ('Copy escaped isolated scene collection', copied.name)
        assert copied.parent == (object_map[original.parent] if original.parent else None), ('Copied parent differs', original.name)
        assert copied.parent_type == original.parent_type and copied.parent_bone == original.parent_bone, ('Parent binding differs', original.name)
        assert matrix_rows(copied.matrix_parent_inverse) == matrix_rows(original.matrix_parent_inverse), ('Parent inverse differs', original.name)
        assert matrix_rows(copied.matrix_basis) == matrix_rows(original.matrix_basis), ('Transform basis differs', original.name)
        assert copied.rotation_mode == original.rotation_mode, ('Rotation mode differs', original.name)
        assert list(copied.location) == list(original.location) and list(copied.scale) == list(original.scale), ('Local position/scale differs', original.name)
        assert list(copied.rotation_euler) == list(original.rotation_euler) and list(copied.rotation_quaternion) == list(original.rotation_quaternion) and list(copied.rotation_axis_angle) == list(original.rotation_axis_angle), ('Stored rotation differs', original.name)
        assert list(copied.delta_location) == list(original.delta_location) and list(copied.delta_scale) == list(original.delta_scale) and list(copied.delta_rotation_euler) == list(original.delta_rotation_euler) and list(copied.delta_rotation_quaternion) == list(original.delta_rotation_quaternion), ('Delta transform differs', original.name)
        object_rows.append({'name': original.name, 'type': copied.type,
                            'parent': reverse_objects[copied.parent].name if copied.parent else None,
                            'matrixLocal': matrix_rows(copied.matrix_local), 'matrixWorld': matrix_rows(copied.matrix_world),
                            'data': reverse_meshes[copied.data].name if copied.data else None,
                            'hideRender': copied.hide_render, 'hideViewport': copied.hide_viewport,
                            'materials': [(slot.link, material_names[slot.material] if slot.material else None) for slot in copied.material_slots]})
        row = {'sourceObject': original.name, 'copiedObject': copied.name,
               'sourceParent': original.parent.name if original.parent else None,
               'copiedParent': copied.parent.name if copied.parent else None}
        if original.type == 'MESH':
            assert copied.data is mesh_map[original.data], ('Copied mesh binding differs', original.name)
            mesh_signatures[original.data.name] = mesh_signature_remapped(copied.data, material_names)
            corner_signatures[original.name] = {'cornerCount': len(copied.data.corner_normals),
                                                'cornerNormalsFnv1a64': fnv1a64_signature([list(n.vector) for n in copied.data.corner_normals]),
                                                'hasCustomNormals': copied.data.has_custom_normals}
            assert len(copied.data.polygons) == (4828 if original.name == CLEANUP['targetSourceObject'] else len(original.data.polygons)), ('Copied polygon count differs', original.name)
            row['sourceMesh'] = original.data.name
            row['copiedMesh'] = copied.data.name
            row['actualTriangles'] = len(copied.data.polygons)
        lineage.append(row)
    for original, copied in material_map.items():
        assert copied.name == CLEANUP['futurePrefix'] + original.name, ('Copied material name differs', original.name)
        if original.node_tree:
            assert copied.node_tree is not original.node_tree, ('Copied material shares embedded node tree', original.name)
        record = material_record(copied)
        record['name'] = original.name
        material_signatures[original.name] = fnv1a64_signature(record)
    signatures = {'algorithm': REFERENCE['sourceSignature']['algorithm'],
                  'objectsFnv1a64': fnv1a64_signature(object_rows), 'meshesFnv1a64': mesh_signatures,
                  'materialsFnv1a64': material_signatures}
    assert signatures['objectsFnv1a64'] == REFERENCE['sourceSignature']['objectsFnv1a64'], 'Object hierarchy/transforms changed.'
    assert signatures['materialsFnv1a64'] == REFERENCE['sourceSignature']['materialsFnv1a64'], 'Material values changed.'
    for name, value in signatures['meshesFnv1a64'].items():
        if name != CLEANUP['targetSourceMesh']:
            assert value == REFERENCE['sourceSignature']['meshesFnv1a64'][name], ('Untargeted mesh changed', name)
    for name, value in corner_signatures.items():
        if name == CLEANUP['targetSourceObject']:
            assert value['cornerCount'] == 14484 and value['hasCustomNormals'] and value['cornerNormalsFnv1a64'] == PROOF['normalReconstruction']['actualEncodedNormalFnv1a64'], 'Retained normals differ from own measured reconstruction.'
        else:
            assert value == REFERENCE['cornerNormals'][name], ('Untargeted raw normals changed', name)
    assert len(object_map) == 55 and len(mesh_map) == 51 and len(material_map) == 51, 'Copy cardinality differs.'
    assert sum(row.get('actualTriangles', 0) for row in lineage) == 43556, 'Copied triangle total differs.'
    return {'copyPassed': True, 'sourceNameNormalizedSignatures': signatures,
            'rawCornerNormalSignatures': corner_signatures, 'objectLineage': lineage,
            'materialLineage': [{'sourceMaterial': original.name, 'copiedMaterial': copied.name} for original, copied in material_map.items()],
            'objects': 55, 'uniqueMeshes': 51, 'materials': 51, 'actualTriangles': 43556,
            'scope': 'All55object transforms/hierarchy and51material graphs preserved;50 untargeted meshes/rawnormals exact. Target retains4828 own faces with explicit geometry/UV/edge/normal reconstruction proof. Not universal art acceptance or raw file-byte equality.'}


def verify_owned_snapshot(snapshot, owned):
    restore_original_context(snapshot)
    changed_scenes = [scene.name for scene, previous in snapshot['scenes'].items() if scene_record(scene) != previous]
    changed_collections = [collection.name for collection, previous in snapshot['collections'].items() if collection_record(collection) != previous]
    current = datablock_sets()
    mismatched_sets = [name for name, previous in snapshot['sets'].items() if current[name] != previous.union(set(owned[name]))]
    result = {'contextRestored': context_record(snapshot['window']) == snapshot['context'],
              'changedPreexistingScenes': changed_scenes, 'changedPreexistingCollections': changed_collections,
              'mismatchedDatablockSets': mismatched_sets,
              'allPreexistingSceneSettingsAndMembershipsPreserved': not changed_scenes,
              'allPreexistingCollectionMembershipsPreserved': not changed_collections,
              'onlyOwnedDatablocksAddedNoPreexistingRemoved': not mismatched_sets,
              'ownedAddedCounts': {name: len(values) for name, values in owned.items()}}
    assert result['contextRestored'] and not changed_scenes and not changed_collections and not mismatched_sets, 'Original context/global state not preserved within owned additions.'
    return result


def rollback_owned(snapshot, owned):
    restore_original_context(snapshot)
    for ob in reversed(owned['objects']):
        assert ob not in snapshot['sets']['objects'], 'Rollback refuses a preexisting object.'
        bpy.data.objects.remove(ob, do_unlink=True)
    owned['objects'].clear()
    for scene in reversed(owned['scenes']):
        assert scene not in snapshot['sets']['scenes'], 'Rollback refuses a preexisting scene.'
        bpy.data.scenes.remove(scene, do_unlink=True)
    owned['scenes'].clear()
    for mesh in reversed(owned['meshes']):
        assert mesh not in snapshot['sets']['meshes'], 'Rollback refuses a preexisting mesh.'
        bpy.data.meshes.remove(mesh, do_unlink=True)
    owned['meshes'].clear()
    for material in reversed(owned['materials']):
        assert material not in snapshot['sets']['materials'], 'Rollback refuses a preexisting material.'
        bpy.data.materials.remove(material, do_unlink=True)
    owned['materials'].clear()


def existing_copy_maps(source, stage):
    object_map = {}
    mesh_map = {}
    material_map = {}
    for row in CLEANUP['copyObjects']:
        original = source.objects.get(row['sourceObject'])
        copied = stage.objects.get(row['copiedObject'])
        assert original is not None and copied is not None, ('Missing own source/copy object', row['sourceObject'])
        object_map[original] = copied
        if original.type == 'MESH':
            assert copied.data.name == row['copiedMesh'], ('Source-copy mesh name changed', row['sourceObject'])
            mesh_map[original.data] = copied.data
    for row in CLEANUP['copyMaterials']:
        original = bpy.data.materials.get(row['sourceMaterial'])
        copied = bpy.data.materials.get(row['copiedMaterial'])
        assert original is not None and copied is not None, ('Missing own source/copy material', row['sourceMaterial'])
        material_map[original] = copied
    assert len(object_map) == 55 and len(mesh_map) == 51 and len(material_map) == 51
    return object_map, mesh_map, material_map

def clone_core_audit(source, stage, object_map, mesh_map, material_map, mounts, expected_core):
    reverse_objects = {copied: original for original, copied in object_map.items()}
    reverse_meshes = {copied: original for original, copied in mesh_map.items()}
    material_names = {copied: original.name for original, copied in material_map.items()}
    assert set(stage.objects) == set(object_map.values()).union(set(mounts)), 'Copied scene has unexpected object members.'
    assert set(stage.collection.objects) == set(object_map.values()).union(set(mounts)) and len(stage.collection.children) == 0, 'Copied scene root membership differs.'
    assert not set(object_map.values()).intersection(set(source.objects)), 'Copied objects alias original objects.'
    assert not set(mesh_map.values()).intersection(set(mesh_map.keys())), 'Copied meshes alias originals.'
    assert not set(material_map.values()).intersection(set(material_map.keys())), 'Copied materials alias originals.'
    object_rows = []
    mesh_signatures = {}
    material_signatures = {}
    corner_signatures = {}
    lineage = []
    for original in sorted(source.objects, key=name_key):
        copied = object_map[original]
        assert copied.name == FIT['prefix'] + original.name, ('Copied object name differs', original.name)
        assert set(copied.users_collection) == {stage.collection}, ('Copy escaped isolated scene collection', copied.name)
        assert copied.parent == (object_map[original.parent] if original.parent else None), ('Copied parent differs', original.name)
        assert copied.parent_type == original.parent_type and copied.parent_bone == original.parent_bone, ('Parent binding differs', original.name)
        assert matrix_rows(copied.matrix_parent_inverse) == matrix_rows(original.matrix_parent_inverse), ('Parent inverse differs', original.name)
        assert matrix_rows(copied.matrix_basis) == matrix_rows(original.matrix_basis), ('Transform basis differs', original.name)
        assert copied.rotation_mode == original.rotation_mode, ('Rotation mode differs', original.name)
        assert list(copied.location) == list(original.location) and list(copied.scale) == list(original.scale), ('Local position/scale differs', original.name)
        assert list(copied.rotation_euler) == list(original.rotation_euler) and list(copied.rotation_quaternion) == list(original.rotation_quaternion) and list(copied.rotation_axis_angle) == list(original.rotation_axis_angle), ('Stored rotation differs', original.name)
        assert list(copied.delta_location) == list(original.delta_location) and list(copied.delta_scale) == list(original.delta_scale) and list(copied.delta_rotation_euler) == list(original.delta_rotation_euler) and list(copied.delta_rotation_quaternion) == list(original.delta_rotation_quaternion), ('Delta transform differs', original.name)
        object_rows.append({'name': original.name, 'type': copied.type,
                            'parent': reverse_objects[copied.parent].name if copied.parent else None,
                            'matrixLocal': matrix_rows(copied.matrix_local), 'matrixWorld': matrix_rows(copied.matrix_world),
                            'data': reverse_meshes[copied.data].name if copied.data else None,
                            'hideRender': copied.hide_render, 'hideViewport': copied.hide_viewport,
                            'materials': [(slot.link, material_names[slot.material] if slot.material else None) for slot in copied.material_slots]})
        row = {'sourceObject': original.name, 'copiedObject': copied.name,
               'sourceParent': original.parent.name if original.parent else None,
               'copiedParent': copied.parent.name if copied.parent else None}
        if original.type == 'MESH':
            assert copied.data is mesh_map[original.data], ('Copied mesh binding differs', original.name)
            mesh_signatures[original.data.name] = mesh_signature_remapped(copied.data, material_names)
            corner_signatures[original.name] = {'cornerCount': len(copied.data.corner_normals),
                                                'cornerNormalsFnv1a64': fnv1a64_signature([list(n.vector) for n in copied.data.corner_normals]),
                                                'hasCustomNormals': copied.data.has_custom_normals}
            assert len(copied.data.polygons) == (4828 if original.name == CLEANUP['targetSourceObject'] else len(original.data.polygons)), ('Copied polygon count differs', original.name)
            row['sourceMesh'] = original.data.name
            row['copiedMesh'] = copied.data.name
            row['actualTriangles'] = len(copied.data.polygons)
        lineage.append(row)
    for original, copied in material_map.items():
        assert copied.name == FIT['prefix'] + original.name, ('Copied material name differs', original.name)
        if original.node_tree:
            assert copied.node_tree is not original.node_tree, ('Copied material shares embedded node tree', original.name)
        record = material_record(copied)
        record['name'] = original.name
        material_signatures[original.name] = fnv1a64_signature(record)
    signatures = {'algorithm': REFERENCE['sourceSignature']['algorithm'],
                  'objectsFnv1a64': fnv1a64_signature(object_rows), 'meshesFnv1a64': mesh_signatures,
                  'materialsFnv1a64': material_signatures}
    assert json_value(signatures) == expected_core['signatures'], 'Copied core source-name-normalized signature mismatch.'
    assert json_value(corner_signatures) == expected_core['normals'], 'Copied core raw normal signature mismatch.'
    assert len(object_map) == 55 and len(mesh_map) == 51 and len(material_map) == 51, 'Copy cardinality differs.'
    assert sum(row.get('actualTriangles', 0) for row in lineage) == 43556, 'Copied triangle total differs.'
    return {'copyPassed': True, 'sourceNameNormalizedSignatures': signatures,
            'rawCornerNormalSignatures': corner_signatures, 'objectLineage': lineage,
            'materialLineage': [{'sourceMaterial': original.name, 'copiedMaterial': copied.name} for original, copied in material_map.items()],
            'objects': 55, 'uniqueMeshes': 51, 'materials': 51, 'actualTriangles': 43556,
            'scope': 'Base55-node hierarchy and all51 material graphs exact; geometry and raw normal signatures match unchanged cleanup plus the two explicitly measured own fitted profiles. Mounts audited separately; no art acceptance.'}

def add(a, b): return tuple(a[k] + b[k] for k in range(3))


def sub(a, b): return tuple(a[k] - b[k] for k in range(3))


def mul(a, s): return tuple(v * s for v in a)


def dot(a, b): return sum(a[k] * b[k] for k in range(3))


def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def length(a): return math.sqrt(dot(a, a))


def unit(a): return mul(a, 1 / length(a))


def clamp(v, low, high): return max(low, min(high, v))


def bounds(points): return [[min(p[k] for p in points) for k in range(3)], [max(p[k] for p in points) for k in range(3)]]


def point_triangle(p, a, b, c):
    ab, ac, ap = sub(b, a), sub(c, a), sub(p, a)
    d1, d2 = dot(ab, ap), dot(ac, ap)
    if d1 <= 0 and d2 <= 0: return length(ap)
    bp = sub(p, b); d3, d4 = dot(ab, bp), dot(ac, bp)
    if d3 >= 0 and d4 <= d3: return length(bp)
    vc = d1 * d4 - d3 * d2
    if vc <= 0 and d1 >= 0 and d3 <= 0: return length(sub(p, add(a, mul(ab, d1 / (d1 - d3)))))
    cp = sub(p, c); d5, d6 = dot(ab, cp), dot(ac, cp)
    if d6 >= 0 and d5 <= d6: return length(cp)
    vb = d5 * d2 - d1 * d6
    if vb <= 0 and d2 >= 0 and d6 <= 0: return length(sub(p, add(a, mul(ac, d2 / (d2 - d6)))))
    va = d3 * d6 - d5 * d4
    if va <= 0 and d4 - d3 >= 0 and d5 - d6 >= 0: return length(sub(p, add(b, mul(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))))))
    denom = 1 / (va + vb + vc)
    return length(sub(p, add(a, add(mul(ab, vb * denom), mul(ac, vc * denom)))))


def segment_segment(p, q, a, b):
    d1, d2, r = sub(q, p), sub(b, a), sub(p, a)
    aa, ee, ff = dot(d1, d1), dot(d2, d2), dot(d2, r)
    cc, bb = dot(d1, r), dot(d1, d2)
    denominator = aa * ee - bb * bb
    s = clamp((bb * ff - cc * ee) / denominator, 0, 1) if denominator != 0 else 0
    t = (bb * s + ff) / ee
    if t < 0: t, s = 0, clamp(-cc / aa, 0, 1)
    elif t > 1: t, s = 1, clamp((bb - cc) / aa, 0, 1)
    return length(sub(add(p, mul(d1, s)), add(a, mul(d2, t))))


def segment_triangle(p, q, a, b, c):
    normal = cross(sub(b, a), sub(c, a))
    direction = sub(q, p); denom = dot(normal, direction)
    if abs(denom) > 1e-20:
        t = dot(normal, sub(a, p)) / denom
        if 0 <= t <= 1:
            hit = add(p, mul(direction, t))
            if point_triangle(hit, a, b, c) < 1e-10: return 0.0
    return min(point_triangle(p, a, b, c), point_triangle(q, a, b, c),
               segment_segment(p, q, a, b), segment_segment(p, q, b, c), segment_segment(p, q, c, a))


def rotate_z(value, axis):
    v = (-axis[1], axis[0], 0)
    return add(value, add(cross(v, value), mul(cross(v, cross(v, value)), 1 / (1 + axis[2]))))


def capsule_clearances(start, end, radius, excluded, intended_role=None, excluded_wall=None):
    expanded = [[min(start[k], end[k]) - radius - 0.1 for k in range(3)], [max(start[k], end[k]) + radius + 0.1 for k in range(3)]]
    minima = {}; tested = 0
    for tri in triangles:
        if tri['name'] in excluded or tri['name'] == excluded_wall: continue
        bb = tri['bounds']
        if any(bb[1][k] < expanded[0][k] or bb[0][k] > expanded[1][k] for k in range(3)): continue
        tested += 1
        distance = segment_triangle(start, end, *tri['p']) - radius
        group = 'intendedHand' if tri['role'] == intended_role else 'unintendedSurface'
        if group not in minima or distance < minima[group]['capsuleClearance']:
            minima[group] = {'capsuleClearance': distance, 'sourceObject': tri['name'], 'sourcePolygon': tri['sourcePolygon'], 'role': tri['role']}
    return {'testedTrianglesAfterAabbFilter': tested, 'searchScope': 'All43556 retained triangles considered by expanded capsule AABB; detailed distances within radius+0.1m only. Unreported surfaces are outside that AABB, not claimed exact global minima.', 'minimaWithinSearch': minima}


def wall_hits(start, side, wall_name):
    hits = []
    for tri in triangles:
        if tri['name'] != wall_name: continue
        if not all(tri['bounds'][0][k] - 1e-9 <= start[k] <= tri['bounds'][1][k] + 1e-9 for k in (1, 2)): continue
        a, b, c = tri['p']; n = cross(sub(b, a), sub(c, a))
        if abs(n[0]) < 1e-16: continue
        x = a[0] - (n[1] * (start[1] - a[1]) + n[2] * (start[2] - a[2])) / n[0]
        t = (x - start[0]) * side
        point = (x, start[1], start[2])
        if t > 0 and point_triangle(point, a, b, c) < 1e-8: hits.append((t, tri['sourcePolygon'], point))
    hits.sort()
    unique = []
    for hit in hits:
        if not unique or abs(hit[0] - unique[-1][0]) > 1e-6: unique.append(hit)
    assert len(unique) >= 2, ('Need own inner and outer wall hits', wall_name)
    return unique

def json_value(value):
    return json.loads(json.dumps(value, allow_nan=False))


def maps_from_rows(source, scene, object_rows, material_rows):
    objects = {}
    meshes = {}
    materials = {}
    for row in object_rows:
        original = source.objects.get(row['sourceObject'])
        copied = scene.objects.get(row['copiedObject'])
        assert original is not None and copied is not None
        objects[original] = copied
        if original.type == 'MESH':
            assert copied.data.name == row['copiedMesh']
            meshes[original.data] = copied.data
    for row in material_rows:
        original = bpy.data.materials.get(row['sourceMaterial'])
        copied = bpy.data.materials.get(row['copiedMaterial'])
        assert original is not None and copied is not None
        materials[original] = copied
    return objects, meshes, materials


def require_three_scenes(source, source_copy, cleanup_scene):
    require_source(source)
    maps = existing_copy_maps(source, source_copy)
    copy_parity(source, source_copy, maps[0], maps[1], maps[2])
    maps = maps_from_rows(source, cleanup_scene, FIT['cleanupObjects'], FIT['cleanupMaterials'])
    result = cleanup_parity(source, cleanup_scene, maps[0], maps[1], maps[2])
    assert json_value(result['sourceNameNormalizedSignatures']) == FIT['cleanupSignatures']
    assert json_value(result['rawCornerNormalSignatures']) == FIT['cleanupNormals']
    return maps


def mesh_topology_uv_flags(mesh):
    return fnv1a64_signature({
        'vertices': len(mesh.vertices),
        'edges': [(list(e.vertices), e.use_seam, e.use_edge_sharp) for e in mesh.edges],
        'polygons': [(list(p.vertices), p.material_index, p.use_smooth) for p in mesh.polygons],
        'uv': [(layer.name, [list(value.uv) for value in layer.data]) for layer in mesh.uv_layers],
        'attributes': [(a.name, a.data_type, a.domain, len(a.data)) for a in mesh.attributes],
    })


def resize_own_profile(source_ob, target_mesh, design, role, material_names):
    assert target_mesh not in snapshot['sets']['meshes'] and target_mesh in owned['meshes']
    original = source_ob.data
    before_structure = mesh_topology_uv_flags(original)
    matrix = source_ob.matrix_world.copy()
    inverse = matrix.inverted()
    normal_to_world = matrix.to_3x3().inverted().transposed()
    normal_to_local = matrix.to_3x3().transposed()
    points = [tuple(matrix @ vertex.co) for vertex in original.vertices]
    lo, hi = bounds(points)
    base = ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2])
    old_length = hi[2] - lo[2]
    levels = sorted(set(round(point[2] - base[2], 6) for point in points))
    radius = max(math.hypot(point[0] - base[0], point[1] - base[1]) for point in points)
    assert len(levels) == 4 and len(original.polygons) == 236
    assert length(sub(base, design['originalBaseCenter'])) < FIT['offlineLiveWorldAgreementMetres']
    assert abs(old_length - design['originalLength']) < FIT['offlineLiveWorldAgreementMetres']
    assert abs(radius - design['originalShaftRadius']) < FIT['offlineLiveWorldAgreementMetres']
    start = design['gripBase'] if role == 'grip' else design['mountStart']
    end = design['gripTip'] if role == 'grip' else design['mountEnd']
    axis = unit(sub(end, start))
    new_length = length(sub(end, start))
    scale = 1 if role == 'grip' else design['mountRadius'] / radius
    lower, upper = levels[1], old_length - levels[2]
    assert new_length > (lower + upper) * scale and 1 + axis[2] > 0.1
    normals = []
    for normal in original.corner_normals:
        world = (normal_to_world @ normal.vector).normalized()
        local = (normal_to_local @ Vector(rotate_z(tuple(world), axis))).normalized()
        normals.append(tuple(local))
    desired_points = []
    for index, point in enumerate(points):
        value = sub(point, base)
        distance = value[2]
        if distance <= lower + 0.00001:
            axial = distance * scale
        elif distance >= old_length - upper - 0.00001:
            axial = new_length - (old_length - distance) * scale
        else:
            fraction = (distance - lower) / (old_length - lower - upper)
            axial = lower * scale + fraction * (new_length - (lower + upper) * scale)
        desired = add(start, rotate_z((value[0] * scale, value[1] * scale, axial), axis))
        desired_points.append(desired)
        target_mesh.vertices[index].co = inverse @ Vector(desired)
    target_mesh.update()
    target_mesh.normals_split_custom_set(normals)
    actual_points = [tuple(matrix @ vertex.co) for vertex in target_mesh.vertices]
    maximum_position_error = max(length(sub(a, b)) for a, b in zip(actual_points, desired_points))
    assert maximum_position_error < FIT['offlineLiveWorldAgreementMetres']
    assert mesh_topology_uv_flags(target_mesh) == before_structure, 'Profile topology, UV, polygon flags or edge flags changed.'
    radius_bound = max(length(sub(point, add(start, mul(axis, clamp(dot(sub(point, start), axis), 0, new_length))))) for point in actual_points)
    assert radius_bound <= radius * scale + FIT['offlineLiveWorldAgreementMetres']
    actual_normals = [tuple(normal.vector) for normal in target_mesh.corner_normals]
    assert len(actual_normals) == len(normals) and target_mesh.has_custom_normals
    maximum_angle = 0
    maximum_chord = 0
    changed = 0
    for requested, actual in zip(normals, actual_normals):
        assert all(math.isfinite(value) for value in actual) and length(actual) > 0.99
        requested_world = unit(tuple(normal_to_world @ Vector(requested)))
        actual_world = unit(tuple(normal_to_world @ Vector(actual)))
        cosine = clamp(dot(requested_world, actual_world), -1, 1)
        assert cosine > 0, 'Encoded profile corner normal reversed hemisphere.'
        maximum_angle = max(maximum_angle, math.degrees(math.acos(cosine)))
        maximum_chord = max(maximum_chord, length(sub(requested_world, actual_world)))
        changed += requested != actual
    normal_signature = {'cornerCount': len(actual_normals), 'cornerNormalsFnv1a64': fnv1a64_signature(actual_normals), 'hasCustomNormals': target_mesh.has_custom_normals}
    return {'role': role, 'sourceControl': design['sourceControl'], 'triangles': len(target_mesh.polygons),
            'vertices': len(target_mesh.vertices), 'start': start, 'end': end, 'radius': radius * scale,
            'sourceAxialLevels': levels, 'sourceRadius': radius, 'sourceLength': old_length,
            'maximumStoredWorldPositionError': maximum_position_error,
            'allProfileVerticesWithinCapsule': True, 'maximumSegmentDistance': radius_bound,
            'topologyUvEdgeFlagsPreserved': True, 'topologyUvEdgeFlagsFnv1a64': before_structure,
            'meshFnv1a64': mesh_signature_remapped(target_mesh, material_names),
            'worldPositionsFnv1a64': fnv1a64_signature(actual_points), 'worldBounds': bounds(actual_points),
            'normalSignature': normal_signature, 'requestedNormalsFnv1a64': fnv1a64_signature(normals),
            'normalEncoding': {'corners': len(normals), 'changedComponentsOrVectors': changed,
                               'maxWorldAngleDegrees': maximum_angle, 'maxWorldUnitChord': maximum_chord,
                               'sameHemisphere': True, 'exactVectorsClaimed': False,
                               'policy': 'Own transformed source vectors measured against actual Blender encoding. No imported tolerance; normal and visual review remain explicit.'}}


snapshot = fresh_snapshot()
owned = {name: [] for name in snapshot['sets']}
source = None
source_copy = None
cleanup_scene = None
preserved_before = None
report = {'stage': 'IVORY_ISOLATED_CONTROL_FIT_V1', 'status': 'STARTED', 'fitConstructedAndAudited': False,
          'sourceUid': REFERENCE['sourceUid'], 'sourceGlbSha256': REFERENCE['sourceGlbSha256'],
          'cleanupReceiptSha256': FIT['cleanupReceiptSha256'], 'offlineClearanceReceiptSha256': FIT['offlineReceiptSha256'],
          'targetScene': FIT['scene'], 'originalContext': snapshot['context'],
          'actualPreexistingDatablockCounts': {name: len(value) for name, value in snapshot['sets'].items()},
          'scope': 'Separate cleanup deep copy: reshape two existing source control profiles in their original object frames and add two copied-profile wall mounts. No original-node transform, pilot pose, seat, beam, role mask, paint, import, render, export or save change.',
          'artAccepted': False, 'runtimeReady': False, 'normalEncodingAndVisualReviewPending': True}
try:
    assert bpy.context.mode == 'OBJECT' and not bpy.app.is_job_running('RENDER'), 'Object mode and root renderer release required.'
    assert bpy.data.scenes.get(FIT['scene']) is None, 'Never overwrite a fit scene.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    source_copy = bpy.data.scenes.get(CLEANUP['sourceCopyScene'])
    cleanup_scene = bpy.data.scenes.get(CLEANUP['futureScene'])
    assert source is not None and source_copy is not None and cleanup_scene is not None
    cleanup_maps = require_three_scenes(source, source_copy, cleanup_scene)
    preserved_before = {scene.name: {'structure': source_signature(scene), 'normals': normal_signatures(scene)} for scene in (source, source_copy, cleanup_scene)}
    triangles = []
    excluded = {design['sourceControl'] for design in FIT['controls']}
    glove_ids = {index for start, count in FIT['gloveCleanedRuns'] for index in range(start, start + count)}
    for original, ob in cleanup_maps[0].items():
        if ob.type != 'MESH':
            continue
        points = [tuple(ob.matrix_world @ vertex.co) for vertex in ob.data.vertices]
        for polygon in ob.data.polygons:
            assert len(polygon.vertices) == 3
            corners = tuple(points[index] for index in polygon.vertices)
            role = 'body'
            if original.name == CLEANUP['targetSourceObject'] and polygon.index in glove_ids:
                role = 'glove-negativeX' if sum(point[0] for point in corners) < 0 else 'glove-positiveX'
            original_index = polygon.index * 2 if original.name == CLEANUP['targetSourceObject'] else polygon.index
            triangles.append({'name': original.name, 'sourcePolygon': original_index, 'p': corners, 'bounds': bounds(corners), 'role': role})
    assert len(triangles) == 43556
    live_clearances = []
    for design in FIT['controls']:
        side = -1 if design['side'] == 'negativeX' else 1
        hits = wall_hits(design['mountStart'], side, design['wallSourceObject'])
        assert length(sub(hits[0][2], design['wallContact'])) < FIT['offlineLiveWorldAgreementMetres']
        assert abs((design['mountEnd'][0] - hits[0][2][0]) * side - 0.002) < FIT['offlineLiveWorldAgreementMetres']
        assert hits[1][0] - hits[0][0] > 0.004
        grip = capsule_clearances(design['gripBase'], design['gripTip'], design['originalShaftRadius'], excluded, 'glove-' + design['side'])
        mount = capsule_clearances(design['mountStart'], design['mountEnd'], design['mountRadius'], excluded, excluded_wall=design['wallSourceObject'])
        intended = grip['minimaWithinSearch']['intendedHand']['capsuleClearance']
        assert 0 < intended < 0.005, 'Own hand capsule proximity must be positive and within 5 mm; physical contact is not claimed.'
        assert grip['minimaWithinSearch']['unintendedSurface']['capsuleClearance'] > 0
        assert mount['minimaWithinSearch']['unintendedSurface']['capsuleClearance'] > 0
        for measured, prior in [(grip, design['gripCapsuleClearances']), (mount, design['mountCapsuleClearancesExcludingIntentionalWall'])]:
            for group, minimum in measured['minimaWithinSearch'].items():
                assert abs(minimum['capsuleClearance'] - prior['minimaWithinSearch'][group]['capsuleClearance']) < FIT['offlineLiveWorldAgreementMetres']
        live_clearances.append({'side': design['side'], 'grip': grip, 'mount': mount, 'wallContact': hits[0][2], 'wallSourcePolygon': hits[0][1], 'wallEmbedMetres': 0.002})
    report['liveClearancesBeforeMutation'] = live_clearances
    cleanup_material_names = {copied: original.name for original, copied in cleanup_maps[2].items()}
    profile_proofs = {}
    for design in FIT['controls']:
        original = source.objects.get(design['sourceControl'])
        control = cleanup_maps[0][original]
        for role in ('grip', 'mount'):
            temporary = control.data.copy()
            owned['meshes'].append(temporary)
            proof = resize_own_profile(control, temporary, design, role, cleanup_material_names)
            profile_proofs[design['sourceControl'] + ':' + role] = proof
            owned['meshes'].remove(temporary)
            bpy.data.meshes.remove(temporary)
    report['ownDisposableProfileEncodingProofs'] = profile_proofs
    for original in source.objects:
        assert bpy.data.objects.get(FIT['prefix'] + original.name) is None
        if original.type == 'MESH':
            assert bpy.data.meshes.get(FIT['prefix'] + original.data.name) is None
    for original in cleanup_maps[2]:
        assert bpy.data.materials.get(FIT['prefix'] + original.name) is None
    for design in FIT['controls']:
        assert bpy.data.objects.get(FIT['prefix'] + design['side'] + ' source profile mount') is None
        assert bpy.data.meshes.get(FIT['prefix'] + design['side'] + ' source profile mount mesh') is None
    target = bpy.data.scenes.new(FIT['scene'])
    owned['scenes'].append(target)
    object_map = {}
    mesh_map = {}
    material_map = {}
    cleanup_material_to_new = {}
    for original, clean_material in cleanup_maps[2].items():
        copied = clean_material.copy()
        owned['materials'].append(copied)
        copied.name = FIT['prefix'] + original.name
        assert copied.name == FIT['prefix'] + original.name
        material_map[original] = copied
        cleanup_material_to_new[clean_material] = copied
    for original, clean_mesh in cleanup_maps[1].items():
        copied = clean_mesh.copy()
        owned['meshes'].append(copied)
        copied.name = FIT['prefix'] + original.name
        assert copied.name == FIT['prefix'] + original.name
        for index, material in enumerate(clean_mesh.materials):
            copied.materials[index] = cleanup_material_to_new[material]
        mesh_map[original] = copied
    for original, clean_object in cleanup_maps[0].items():
        copied = clean_object.copy()
        owned['objects'].append(copied)
        copied.name = FIT['prefix'] + original.name
        assert copied.name == FIT['prefix'] + original.name
        if original.type == 'MESH':
            copied.data = mesh_map[original.data]
        target.collection.objects.link(copied)
        object_map[original] = copied
    for original, copied in object_map.items():
        copied.parent = object_map[original.parent] if original.parent else None
    target.view_layers[0].update()
    expected_core = {'signatures': FIT['cleanupSignatures'], 'normals': FIT['cleanupNormals']}
    report['unchangedCleanupDeepCopyPassed'] = clone_core_audit(source, target, object_map, mesh_map, material_map, [], expected_core)['copyPassed']
    expected_core = json_value(expected_core)
    material_names = {copied: original.name for original, copied in material_map.items()}
    mount_objects = []
    profile_results = []
    for design in FIT['controls']:
        original = source.objects.get(design['sourceControl'])
        clean_control = cleanup_maps[0][original]
        copied_control = object_map[original]
        for role in ('grip', 'mount'):
            if role == 'grip':
                changed = copied_control
            else:
                mesh = clean_control.data.copy()
                owned['meshes'].append(mesh)
                mesh.name = FIT['prefix'] + design['side'] + ' source profile mount mesh'
                assert mesh.name == FIT['prefix'] + design['side'] + ' source profile mount mesh'
                for index, material in enumerate(clean_control.data.materials):
                    mesh.materials[index] = cleanup_material_to_new[material]
                changed = clean_control.copy()
                owned['objects'].append(changed)
                changed.name = FIT['prefix'] + design['side'] + ' source profile mount'
                assert changed.name == FIT['prefix'] + design['side'] + ' source profile mount'
                changed.data = mesh
                target.collection.objects.link(changed)
                changed.parent = object_map[original.parent] if original.parent else None
                mount_objects.append(changed)
            result = resize_own_profile(clean_control, changed.data, design, role, material_names)
            assert json_value(result) == json_value(profile_proofs[design['sourceControl'] + ':' + role]), 'Own fit does not reproduce its actual disposable profile result.'
            if role == 'grip':
                expected_core['signatures']['meshesFnv1a64'][original.data.name] = result['meshFnv1a64']
                expected_core['normals'][original.name] = result['normalSignature']
            profile_results.append({'object': changed.name, 'mesh': changed.data.name, 'parent': changed.parent.name if changed.parent else None, 'originalSourceObject': original.name, 'profile': result})
    target.view_layers[0].update()
    for mount in mount_objects:
        row = next(row for row in profile_results if row['object'] == mount.name)
        original = source.objects.get(row['originalSourceObject'])
        control = object_map[original]
        assert matrix_rows(mount.matrix_world) == matrix_rows(control.matrix_world)
        assert matrix_rows(mount.matrix_basis) == matrix_rows(control.matrix_basis)
        assert matrix_rows(mount.matrix_parent_inverse) == matrix_rows(control.matrix_parent_inverse)
        assert mount.parent == control.parent and mount.parent_type == control.parent_type and mount.parent_bone == control.parent_bone
        assert set(mount.users_collection) == {target.collection}
        assert mount.data is not control.data and len(mount.data.polygons) == 236
        assert [slot.material for slot in mount.material_slots] == [slot.material for slot in control.material_slots]
    report['coreAudit'] = clone_core_audit(source, target, object_map, mesh_map, material_map, mount_objects, expected_core)
    assert len(target.objects) == 57 and len({ob.data for ob in target.objects if ob.type == 'MESH'}) == 53
    assert sum(len(ob.data.polygons) for ob in target.objects if ob.type == 'MESH') == 44028
    report['actualCounts'] = {'objects': 57, 'meshes': 53, 'materials': 51, 'triangles': 44028}
    report['profileResults'] = profile_results
    report['fittedSceneSignature'] = source_signature(target)
    report['fittedSceneRawNormalSignatures'] = normal_signatures(target)
    require_three_scenes(source, source_copy, cleanup_scene)
    report['preservedThreeScenes'] = {scene.name: {'structure': source_signature(scene), 'normals': normal_signatures(scene)} for scene in (source, source_copy, cleanup_scene)} == preserved_before
    assert report['preservedThreeScenes']
    report['globalPreservation'] = verify_owned_snapshot(snapshot, owned)
    report['fitConstructedAndAudited'] = True
    report['status'] = 'ISOLATED_FIT_CONSTRUCTED_NORMAL_AND_VISUAL_REVIEW_PENDING'
except Exception as error:
    report['status'] = 'FAILED'
    report['error'] = str(error)
    try:
        rollback_owned(snapshot, owned)
        report['ownedRollbackCompleted'] = True
    except Exception as rollback_error:
        report['ownedRollbackCompleted'] = False
        report['rollbackError'] = str(rollback_error)
finally:
    try:
        if preserved_before is not None:
            require_three_scenes(source, source_copy, cleanup_scene)
            report['preservedThreeScenes'] = {scene.name: {'structure': source_signature(scene), 'normals': normal_signatures(scene)} for scene in (source, source_copy, cleanup_scene)} == preserved_before
            assert report['preservedThreeScenes']
        report['globalPreservation'] = verify_owned_snapshot(snapshot, owned)
    except Exception as final_error:
        report['fitConstructedAndAudited'] = False
        report['status'] = 'FAILED'
        report['finalPreservationError'] = str(final_error)
    print('IVORY_CONTROL_FIT_RECEIPT_BEGIN')
    print(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False))
    print('IVORY_CONTROL_FIT_RECEIPT_END')
