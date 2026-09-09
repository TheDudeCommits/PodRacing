"""Prepared safe Ivory cleanup preparation; external composition only, no file IO in payload."""
import bpy
import json
import math
from mathutils import Vector

REFERENCE = {'sourceUid': 'e42fb924b344481ea013c58cb0f52ad7', 'sourceScene': 'PodRacing — source e42fb924b344481ea013c58cb0f52ad7 retry 20260908', 'targetScene': 'PodRacing — Blockrunner Ivory source copy V1 e42fb924b344481ea013c58cb0f52ad7', 'objectPrefix': 'Blockrunner Ivory source V1 ', 'sourceGlbSha256': '2ed231e15b8bbab3f7b7028b73e8b6f442d532c9bc4d1fc0a2f5c40aeda49576', 'auditReceiptSha256': 'f5375ba02bd017af32f833af96b2f7ccf4ab61d505acf754ee9ad48cae621079', 'normalSampleReceiptSha256': '6f0be7447392eb2779bd35b8b927ca013c7fd988a41904bf873423cd8f922e82', 'sourceSignature': {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic', 'materialsFnv1a64': {'lambert1.002': '39a62bfe6310aed6', 'pasted__LegoWhite1.001': '2e64e9defa8451f3', 'pasted__LegoWhite3.001': '8507f76fca6ddd6d', 'pasted__LegoWhite4': '3d89d9612d134265', 'pasted__Lego_White12': '61c3cde1e73fdc23', 'pasted__Lego_White15.001': 'cc1c8c6814734c3b', 'pasted__Lego_White16.001': 'a84aa217880d8448', 'pasted__Lego_White18.001': 'c920f6c29e05da32', 'pasted__Lego_White19': '87ea0c5daaef6bfc', 'pasted__Lego_White20.001': 'fa03cc6f64776ddf', 'pasted__Lego_White22.001': 'c6a0df6e6fc52d29', 'pasted__Lego_White23.001': 'e77bf9537e8200fc', 'pasted__Lego_White24.001': '978d2368e934a3c3', 'pasted__Lego_White25': '04e09d60b5e87461', 'pasted__Lego_White7': '76cd95d1071d3f47', 'pasted__Lego_White8.001': 'c78127755e46e687', 'pasted__Lego_White9': '797b1e38ec17184d', 'pasted__pasted__LegoWhite1.001': '1c47281497e31f0a', 'pasted__pasted__LegoWhite3.001': '6292f58165f7e5d4', 'pasted__pasted__LegoWhite4': 'e367d1fdbf915950', 'pasted__pasted__Lego_White12': '65c0a68a79d0864a', 'pasted__pasted__Lego_White14': 'afb5c1216e036660', 'pasted__pasted__Lego_White16': 'b574194203bfd176', 'pasted__pasted__Lego_White18.001': '4931bb430895948f', 'pasted__pasted__Lego_White19.001': 'c4e83d88ce6d4382', 'pasted__pasted__Lego_White20': '5e0afb69fc903595', 'pasted__pasted__Lego_White25': '112e2ef171bdb588', 'pasted__pasted__Lego_White26': '6f421e2e79609877', 'pasted__pasted__Lego_White7': '0f1bf1e9b9b4d060', 'pasted__pasted__Lego_White8.001': '2a5aba707de25aac', 'pasted__pasted__Lego_White9': '31316177c911cbe2', 'pasted__pasted__pasted__Lego_White12': 'af71a84e889e9d67', 'pasted__pasted__pasted__Lego_White14': '535226e03e64d705', 'pasted__pasted__pasted__Lego_White15': 'eb26c55ab6cc750c', 'pasted__pasted__pasted__Lego_White16': '8c145d3753906a0b', 'pasted__pasted__pasted__Lego_White19.001': '3abdff85446d74ab', 'pasted__pasted__pasted__Lego_White25': '811db75fc408463d', 'pasted__pasted__pasted__pasted__Lego_White11': '7569e043e0c7efc9', 'pasted__pasted__pasted__pasted__Lego_White14': '4033279429aaa464', 'pasted__pasted__pasted__pasted__Lego_White15': 'b9c1689d9fe118bd', 'pasted__pasted__pasted__pasted__Lego_White16': '98dc9b98715ef63a', 'pasted__pasted__pasted__pasted__Lego_White25': '23ca769892a5478c', 'pasted__pasted__pasted__pasted__pasted__Lego_White11': '46064cdbad001e1c', 'pasted__pasted__pasted__pasted__pasted__Lego_White14': '4788a24a9aa63e21', 'pasted__pasted__pasted__pasted__pasted__Lego_White25': '747bb148e6cb5019', 'pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '477dbedc856b0a60', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '308a2247cf35a815', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '6c2f978f47f305c4', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26': '08f0c8b969edc3e3', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': '60c35fd95f6d4771', 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25': 'f5a85b024e41b778'}, 'meshesFnv1a64': {'pasted__L2x3slope2_lambert1_0': '67fd2da0bf899610', 'pasted__L2x3slope2_pasted__LegoWhite1_0': '0913fe471aab38a6', 'pasted__L2x3slope2_pasted__LegoWhite3_0': '2147053ec36150df', 'pasted__L2x3slope2_pasted__LegoWhite4_0': '6c54943ec1599bcf', 'pasted__L2x3slope2_pasted__Lego_White12_0': '4bc58ea5e07e402b', 'pasted__L2x3slope2_pasted__Lego_White15_0': '054b23f0390c35bc', 'pasted__L2x3slope2_pasted__Lego_White16_0': 'ba3fe5c1b4cda66b', 'pasted__L2x3slope2_pasted__Lego_White18_0': 'ca4f0fb8b724ab3a', 'pasted__L2x3slope2_pasted__Lego_White19_0': 'e0e99b3430e84def', 'pasted__L2x3slope2_pasted__Lego_White20_0': 'dfdebfc83f876639', 'pasted__L2x3slope2_pasted__Lego_White22_0': 'a46102c8c380ac59', 'pasted__L2x3slope2_pasted__Lego_White23_0': '0f3608e2c4f1ecaf', 'pasted__L2x3slope2_pasted__Lego_White24_0': 'd2cc9ea49baec9d2', 'pasted__L2x3slope2_pasted__Lego_White25_0': '73910da45f0c7ac8', 'pasted__L2x3slope2_pasted__Lego_White7_0': '66dc0b0d8f903183', 'pasted__L2x3slope2_pasted__Lego_White8_0': 'e175d00c1834b6e4', 'pasted__L2x3slope2_pasted__Lego_White9_0': 'e820f73c82c516e9', 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0': '457e2df12982e376', 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0': '09fecdd243b615f1', 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0': '8d6baceeb233ce01', 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0': '443aa3044b11ce8b', 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0': '0470bc9c2cfaba4c', 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0': 'b5d9ede588c2f8ca', 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0': '5ba68ea060f532ec', 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0': '3fec2e751cb62081', 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0': 'a16ff14611b568ce', 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0': '8409c6947be7442a', 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0': '3e919f3f632388ff', 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0': 'dab4923aa59bb602', 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0': '71c5d5ade6194ce2', 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0': '266d3218e39a3354', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0': 'b6578440a8140da2', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0': '21d1877c23258da2', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0': 'abd40576bac68ea5', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0': '3f3b391eb22b96d4', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0': 'c4d0baf996fd50d8', 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0': '0bf68ff04cf9af46', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0': '9877a3550fda0c97', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0': '63299d1b7d4f9b1b', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0': '503a8ab530bd6d3e', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0': '5ee1187333e4da0b', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0': '8c4f094d2038718f', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0': 'e8e35853546b1c68', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0': 'e5fd963edf59dc7c', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0': 'e7b0ac45e95f5e2b', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '504ef0323110df24', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': 'b45eded8b4e3b95c', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '599350cac7c679f6', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0': '995865eabc386e88', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '3cf9a02a878823ed', 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': '89f840db8b0588af'}, 'objectsFnv1a64': '7a1811af8c772245'}, 'cornerNormals': {'pasted__L2x3slope2_lambert1_0': {'cornerCount': 28968, 'cornerNormalsFnv1a64': 'b966dd79e22d9b4b', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__LegoWhite1_0': {'cornerCount': 4836, 'cornerNormalsFnv1a64': 'b6e4a59d53cf16cb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__LegoWhite3_0': {'cornerCount': 720, 'cornerNormalsFnv1a64': '3c4611f43d131b62', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__LegoWhite4_0': {'cornerCount': 708, 'cornerNormalsFnv1a64': 'c6acda9b553f7f50', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White12_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '30fd8e2fbd6ac3f1', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White15_0': {'cornerCount': 1140, 'cornerNormalsFnv1a64': '2bd28b68c0f219bb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White16_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '48c4a2089ce59d32', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White18_0': {'cornerCount': 2808, 'cornerNormalsFnv1a64': '5e8016d53d249b24', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White19_0': {'cornerCount': 2124, 'cornerNormalsFnv1a64': '68d76bd040a410b5', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White20_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '9a7c9142501f5ad3', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White22_0': {'cornerCount': 1140, 'cornerNormalsFnv1a64': 'a938bf342b78f1c5', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White23_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '57a42388b8c1ac72', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White24_0': {'cornerCount': 780, 'cornerNormalsFnv1a64': '867378f1a2e047de', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '6e8340e0a8d7b263', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White7_0': {'cornerCount': 11304, 'cornerNormalsFnv1a64': '1bc2b25fe6fda29e', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White8_0': {'cornerCount': 6084, 'cornerNormalsFnv1a64': 'e7c1bf11c20f42a3', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__Lego_White9_0': {'cornerCount': 2484, 'cornerNormalsFnv1a64': 'd8258ccb49f44781', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0': {'cornerCount': 4836, 'cornerNormalsFnv1a64': '738a4c877bc1c1bb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0': {'cornerCount': 720, 'cornerNormalsFnv1a64': '0be435c685b699d5', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0': {'cornerCount': 708, 'cornerNormalsFnv1a64': '6285dc0acca751b7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '2f51dd59fbb7a633', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '3540545055579095', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '93f3d637652fb360', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0': {'cornerCount': 2808, 'cornerNormalsFnv1a64': '1916c9a284f2e44c', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '450f96a01b8e4258', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0': {'cornerCount': 2124, 'cornerNormalsFnv1a64': '88beba74289eb6a7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': 'bfa4b452eb09c970', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '78fbc730085e047b', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0': {'cornerCount': 11304, 'cornerNormalsFnv1a64': 'ec9ca588cdad7e9f', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0': {'cornerCount': 6084, 'cornerNormalsFnv1a64': 'e8a229a1f9869693', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0': {'cornerCount': 2484, 'cornerNormalsFnv1a64': 'cdf95c6183b288b3', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': '05747f312dc32c6b', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '6b7a6a04e6e116b7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': 'fee622d4ca983367', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '9f60ea1601dd1b34', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': 'a2760196a97ac3e8', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '68f62f84b51348e7', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0': {'cornerCount': 11400, 'cornerNormalsFnv1a64': '38f8fa5dc75adedf', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': 'ec462f1146fa16fb', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0': {'cornerCount': 1044, 'cornerNormalsFnv1a64': 'c76f76fa963f7c08', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': '4cd5f3504ca5166a', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '1c1d762c16c735f0', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0': {'cornerCount': 11400, 'cornerNormalsFnv1a64': '150898d7aa6fba1a', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0': {'cornerCount': 684, 'cornerNormalsFnv1a64': 'cebed9ab001b1914', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': 'c2c80fe85b8ea973', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '54fc201aa40668bc', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '3b6659f3ab5b3db1', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '2f02b88ff1aed378', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '10e1a71ac0ca2070', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': '831c0924acc92bd1', 'hasCustomNormals': True}, 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0': {'cornerCount': 1080, 'cornerNormalsFnv1a64': 'd6fea65d2c0ff23f', 'hasCustomNormals': True}}, 'meshes': [{'name': 'pasted__L2x3slope2_lambert1_0', 'triangles': 9656, 'firstGlobalTriangle': 0, 'positionFnv': '3175e7c06687cdfd', 'uvFnv': 'e51f01c4085c0c6d', 'triangulationFnv': '7cacb2f008039a30'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'triangles': 3768, 'firstGlobalTriangle': 9656, 'positionFnv': 'a6ed690130cc67a1', 'uvFnv': 'f6de85f87c99ff57', 'triangulationFnv': '530e24661fb5b332'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White8_0', 'triangles': 2028, 'firstGlobalTriangle': 13424, 'positionFnv': '84b8ad3a7cb29361', 'uvFnv': '447604b6dee29631', 'triangulationFnv': 'fd50b8c0e840532f'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White9_0', 'triangles': 828, 'firstGlobalTriangle': 15452, 'positionFnv': '2401d6978d674e45', 'uvFnv': '34040b7d98e23ced', 'triangulationFnv': 'b167f7f4c6e65738'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White12_0', 'triangles': 348, 'firstGlobalTriangle': 16280, 'positionFnv': '159f5beb4e4312ab', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White15_0', 'triangles': 380, 'firstGlobalTriangle': 16628, 'positionFnv': 'ade52b17a633d74e', 'uvFnv': '6b2de35df9c8043c', 'triangulationFnv': 'e69c483134a21a7f'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White16_0', 'triangles': 348, 'firstGlobalTriangle': 17008, 'positionFnv': '2bc3fda0506951d0', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White18_0', 'triangles': 936, 'firstGlobalTriangle': 17356, 'positionFnv': '9ffc2ca5f04efa69', 'uvFnv': '8b0686d72214bc4d', 'triangulationFnv': '1514aac33c6e0751'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White19_0', 'triangles': 708, 'firstGlobalTriangle': 18292, 'positionFnv': '16157f5080bb8ac9', 'uvFnv': '5182e7414a0ca4bc', 'triangulationFnv': 'a92ddac239aaa2c6'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White20_0', 'triangles': 348, 'firstGlobalTriangle': 19000, 'positionFnv': 'a323a78b9700df88', 'uvFnv': '171a0db538516439', 'triangulationFnv': 'e02430107b3c8ddf'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White22_0', 'triangles': 380, 'firstGlobalTriangle': 19348, 'positionFnv': '2a9a018f07f18294', 'uvFnv': '6b2de35df9c8043c', 'triangulationFnv': 'e69c483134a21a7f'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White23_0', 'triangles': 228, 'firstGlobalTriangle': 19728, 'positionFnv': '9fbc54416b3cdc80', 'uvFnv': 'aec4ac9fe2e28c31', 'triangulationFnv': 'cda0e69bfc6530aa'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White24_0', 'triangles': 260, 'firstGlobalTriangle': 19956, 'positionFnv': '00992a77df80af10', 'uvFnv': '1c56e9b5a1ff2238', 'triangulationFnv': 'e3ea9a16ebeaa59b'}, {'name': 'pasted__L2x3slope2_pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 20216, 'positionFnv': '9c157c041a6d1726', 'uvFnv': '825107a65a70810a', 'triangulationFnv': '96c21f7bb5b5bd7a'}, {'name': 'pasted__L2x3slope2_pasted__LegoWhite1_0', 'triangles': 1612, 'firstGlobalTriangle': 20576, 'positionFnv': '878729d9dd84a84e', 'uvFnv': '7425d5e5d9c53c26', 'triangulationFnv': '6d4bafb85aadcae4'}, {'name': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'triangles': 240, 'firstGlobalTriangle': 22188, 'positionFnv': 'a64282c3935f8927', 'uvFnv': 'a18dbab129d75563', 'triangulationFnv': '792c3c8dc6c53d31'}, {'name': 'pasted__L2x3slope2_pasted__LegoWhite4_0', 'triangles': 236, 'firstGlobalTriangle': 22428, 'positionFnv': '49f2d495855b5873', 'uvFnv': '48d694cea7b410e0', 'triangulationFnv': 'ff29c9f0441447e2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'triangles': 3768, 'firstGlobalTriangle': 22664, 'positionFnv': 'ad2877e7d427be59', 'uvFnv': 'f6de85f87c99ff57', 'triangulationFnv': '530e24661fb5b332'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'triangles': 2028, 'firstGlobalTriangle': 26432, 'positionFnv': '3450a8b64cbb105e', 'uvFnv': '447604b6dee29631', 'triangulationFnv': 'fd50b8c0e840532f'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'triangles': 828, 'firstGlobalTriangle': 28460, 'positionFnv': '133bf219711b3f95', 'uvFnv': '34040b7d98e23ced', 'triangulationFnv': 'b167f7f4c6e65738'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'triangles': 348, 'firstGlobalTriangle': 29288, 'positionFnv': '46896a989a381cd1', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'triangles': 228, 'firstGlobalTriangle': 29636, 'positionFnv': 'fefdd9d4782873ee', 'uvFnv': 'aec4ac9fe2e28c31', 'triangulationFnv': 'cda0e69bfc6530aa'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'triangles': 348, 'firstGlobalTriangle': 29864, 'positionFnv': '3ab272d0732c4828', 'uvFnv': '055dead886509797', 'triangulationFnv': '2b81619c2994acee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'triangles': 936, 'firstGlobalTriangle': 30212, 'positionFnv': 'a6b74afdfe96ee67', 'uvFnv': '8b0686d72214bc4d', 'triangulationFnv': 'e007883bd4c99087'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'triangles': 348, 'firstGlobalTriangle': 31148, 'positionFnv': 'a07283078503e886', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'triangles': 708, 'firstGlobalTriangle': 31496, 'positionFnv': '3a3c0ec80f82151c', 'uvFnv': 'd2ed647d3e91dfcc', 'triangulationFnv': 'fe70e15cd4dbcaab'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 32204, 'positionFnv': '495df6778bb09f49', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'b71082d836b2fbe0'}, {'name': 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'triangles': 360, 'firstGlobalTriangle': 32564, 'positionFnv': '43c066015d96d363', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'db94ca32556a683b'}, {'name': 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'triangles': 1612, 'firstGlobalTriangle': 32924, 'positionFnv': 'f58e2020ad888210', 'uvFnv': '7425d5e5d9c53c26', 'triangulationFnv': '6d4bafb85aadcae4'}, {'name': 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'triangles': 240, 'firstGlobalTriangle': 34536, 'positionFnv': 'ec8a6eed41c4d62f', 'uvFnv': 'a18dbab129d75563', 'triangulationFnv': '792c3c8dc6c53d31'}, {'name': 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'triangles': 236, 'firstGlobalTriangle': 34776, 'positionFnv': 'c31a3a9ea2b0757b', 'uvFnv': '48d694cea7b410e0', 'triangulationFnv': 'ff29c9f0441447e2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'triangles': 348, 'firstGlobalTriangle': 35012, 'positionFnv': '017f0b32bcffde7b', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'triangles': 228, 'firstGlobalTriangle': 35360, 'positionFnv': 'fa3be8280ba9bf18', 'uvFnv': 'aec4ac9fe2e28c31', 'triangulationFnv': 'cda0e69bfc6530aa'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'triangles': 348, 'firstGlobalTriangle': 35588, 'positionFnv': '416c4d5773312fb9', 'uvFnv': '055dead886509797', 'triangulationFnv': '2b81619c2994acee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'triangles': 228, 'firstGlobalTriangle': 35936, 'positionFnv': '598179c540de7c62', 'uvFnv': '5cfd0b8d8109721b', 'triangulationFnv': 'f0cfe12ab1d18532'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'triangles': 348, 'firstGlobalTriangle': 36164, 'positionFnv': '453eefe4f01acf47', 'uvFnv': 'e7aafc8f733274c1', 'triangulationFnv': 'd938cba490fed3ee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 36512, 'positionFnv': '1995c55cfd43378f', 'uvFnv': '825107a65a70810a', 'triangulationFnv': '3efc0667143b6c2d'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'triangles': 3800, 'firstGlobalTriangle': 36872, 'positionFnv': 'b4a2893165c9d84d', 'uvFnv': 'c66f938a20b27161', 'triangulationFnv': '6ec0ff1106777dc0'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'triangles': 228, 'firstGlobalTriangle': 40672, 'positionFnv': 'f641062d61e60cc3', 'uvFnv': 'aec4ac9fe2e28c31', 'triangulationFnv': 'cda0e69bfc6530aa'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'triangles': 348, 'firstGlobalTriangle': 40900, 'positionFnv': 'd6d21774e511272d', 'uvFnv': '055dead886509797', 'triangulationFnv': '2b81619c2994acee'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'triangles': 228, 'firstGlobalTriangle': 41248, 'positionFnv': '5bd496839c31568d', 'uvFnv': '5cfd0b8d8109721b', 'triangulationFnv': 'f0cfe12ab1d18532'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 41476, 'positionFnv': '621a921479e2fbe7', 'uvFnv': '825107a65a70810a', 'triangulationFnv': '55427ac654290825'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'triangles': 3800, 'firstGlobalTriangle': 41836, 'positionFnv': '2d65aac1abe685a5', 'uvFnv': 'ed8c607bbb0e40f3', 'triangulationFnv': 'ec8a344444263ed0'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'triangles': 228, 'firstGlobalTriangle': 45636, 'positionFnv': 'f9ff2c56e0a9dcb6', 'uvFnv': '5cfd0b8d8109721b', 'triangulationFnv': 'f0cfe12ab1d18532'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 45864, 'positionFnv': 'b08522bd0a91aa7c', 'uvFnv': '825107a65a70810a', 'triangulationFnv': '89afc3cc530484f3'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 46224, 'positionFnv': 'e454d31b9a6be79c', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 46584, 'positionFnv': '830c42ff17b57820', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 46944, 'positionFnv': 'faba58b161e8c09c', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'triangles': 360, 'firstGlobalTriangle': 47304, 'positionFnv': '9bc3eec300aabb0b', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 47664, 'positionFnv': 'd527f775543ce810', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}, {'name': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'triangles': 360, 'firstGlobalTriangle': 48024, 'positionFnv': '435e9adbf61f8e1d', 'uvFnv': '825107a65a70810a', 'triangulationFnv': 'ae1354d520f1eec2'}]}
CLEANUP = {'sourceCopyScene': 'PodRacing — Blockrunner Ivory source copy V1 e42fb924b344481ea013c58cb0f52ad7', 'copyReceiptSha256': '62cb9bae25a53aac5fb2e6c0291fa4cab0d4107a3a6c6a354a9de4e782e03e10', 'inputsSha256': '8a0dc7a4f7bec7d8b48603d3ce508c9091e84fa4ecb4c7b79e3f8ea69883f25c', 'targetSourceObject': 'pasted__L2x3slope2_lambert1_0', 'targetSourceMesh': 'pasted__L2x3slope2_lambert1_0', 'targetCopyObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_lambert1_0', 'pairCount': 4828, 'pairsFnv': 'd1f9b1421c8d3801', 'roleRuns': {'helmet': [[2994, 192], [3202, 64], [3744, 392], [4216, 64], [4888, 64], [6342, 128], [6502, 64], [6738, 32], [6774, 64], [6858, 256], [7178, 160]], 'visor': [[2322, 44], [3478, 106], [4772, 116], [6276, 66], [6726, 12], [6770, 4], [6838, 20], [7402, 32]], 'gloves': [[1400, 456], [2290, 32], [5080, 32], [5552, 64], [6470, 32], [6566, 64], [6694, 32], [7434, 32], [7530, 360], [8000, 64], [8922, 64], [9514, 32], [9560, 96]], 'suit': [[1856, 434], [2366, 628], [3186, 16], [3266, 212], [3584, 160], [4136, 80], [4280, 492], [4952, 128], [5112, 440], [5616, 660], [6630, 64], [7114, 64], [7338, 64], [7466, 64], [7890, 110], [8064, 858], [8986, 528], [9546, 14]], 'body-remainder': [[0, 1400]]}, 'futureScene': 'PodRacing — Blockrunner Ivory exact opposing cleanup V1 e42fb924b344481ea013c58cb0f52ad7', 'futurePrefix': 'Blockrunner Ivory cleanup V1 ', 'copyObjects': [{'copiedObject': 'Blockrunner Ivory source V1 RootNode.017', 'copiedParent': 'Blockrunner Ivory source V1 eac2d5995b764e22b2b7b9ca17e830af.fbx', 'sourceObject': 'RootNode.017', 'sourceParent': 'eac2d5995b764e22b2b7b9ca17e830af.fbx'}, {'copiedObject': 'Blockrunner Ivory source V1 Sketchfab_model.040', 'copiedParent': None, 'sourceObject': 'Sketchfab_model.040', 'sourceParent': None}, {'copiedObject': 'Blockrunner Ivory source V1 eac2d5995b764e22b2b7b9ca17e830af.fbx', 'copiedParent': 'Blockrunner Ivory source V1 Sketchfab_model.040', 'sourceObject': 'eac2d5995b764e22b2b7b9ca17e830af.fbx', 'sourceParent': 'Sketchfab_model.040'}, {'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'copiedParent': 'Blockrunner Ivory source V1 RootNode.017', 'sourceObject': 'pasted__L2x3slope2', 'sourceParent': 'RootNode.017'}, {'actualTriangles': 9656, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_lambert1_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_lambert1_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_lambert1_0', 'sourceObject': 'pasted__L2x3slope2_lambert1_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 1612, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite1_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite1_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__LegoWhite1_0', 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite1_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 240, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite3_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite3_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 236, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite4_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__LegoWhite4_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__LegoWhite4_0', 'sourceObject': 'pasted__L2x3slope2_pasted__LegoWhite4_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White12_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White12_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White12_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White12_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 380, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White15_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White15_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White15_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White15_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 936, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White18_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White18_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White18_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White18_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 708, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White19_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White19_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White19_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White19_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White20_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White20_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White20_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White20_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 380, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White22_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White22_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White22_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White22_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White23_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White23_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White23_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White23_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 260, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White24_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White24_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White24_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White24_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3768, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White7_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White7_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 2028, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White8_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White8_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White8_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White8_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 828, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White9_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__Lego_White9_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__Lego_White9_0', 'sourceObject': 'pasted__L2x3slope2_pasted__Lego_White9_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 1612, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite1_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 240, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite3_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 236, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__LegoWhite4_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White12_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 936, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White18_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White19_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 708, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White20_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White26_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3768, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White7_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 2028, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White8_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 828, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__Lego_White9_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White12_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White15_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White19_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3800, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 348, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White15_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White16_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 3800, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White11_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 228, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White14_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}, {'actualTriangles': 360, 'copiedMesh': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedObject': 'Blockrunner Ivory source V1 pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'copiedParent': 'Blockrunner Ivory source V1 pasted__L2x3slope2', 'sourceMesh': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceObject': 'pasted__L2x3slope2_pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25_0', 'sourceParent': 'pasted__L2x3slope2'}], 'copyMaterials': [{'copiedMaterial': 'Blockrunner Ivory source V1 lambert1.002', 'sourceMaterial': 'lambert1.002'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__LegoWhite1.001', 'sourceMaterial': 'pasted__LegoWhite1.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__LegoWhite3.001', 'sourceMaterial': 'pasted__LegoWhite3.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__LegoWhite4', 'sourceMaterial': 'pasted__LegoWhite4'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White12', 'sourceMaterial': 'pasted__Lego_White12'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White15.001', 'sourceMaterial': 'pasted__Lego_White15.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White16.001', 'sourceMaterial': 'pasted__Lego_White16.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White18.001', 'sourceMaterial': 'pasted__Lego_White18.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White19', 'sourceMaterial': 'pasted__Lego_White19'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White20.001', 'sourceMaterial': 'pasted__Lego_White20.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White22.001', 'sourceMaterial': 'pasted__Lego_White22.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White23.001', 'sourceMaterial': 'pasted__Lego_White23.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White24.001', 'sourceMaterial': 'pasted__Lego_White24.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White25', 'sourceMaterial': 'pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White7', 'sourceMaterial': 'pasted__Lego_White7'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White8.001', 'sourceMaterial': 'pasted__Lego_White8.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__Lego_White9', 'sourceMaterial': 'pasted__Lego_White9'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__LegoWhite1.001', 'sourceMaterial': 'pasted__pasted__LegoWhite1.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__LegoWhite3.001', 'sourceMaterial': 'pasted__pasted__LegoWhite3.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__LegoWhite4', 'sourceMaterial': 'pasted__pasted__LegoWhite4'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White12', 'sourceMaterial': 'pasted__pasted__Lego_White12'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White16', 'sourceMaterial': 'pasted__pasted__Lego_White16'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White18.001', 'sourceMaterial': 'pasted__pasted__Lego_White18.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White19.001', 'sourceMaterial': 'pasted__pasted__Lego_White19.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White20', 'sourceMaterial': 'pasted__pasted__Lego_White20'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White26', 'sourceMaterial': 'pasted__pasted__Lego_White26'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White7', 'sourceMaterial': 'pasted__pasted__Lego_White7'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White8.001', 'sourceMaterial': 'pasted__pasted__Lego_White8.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__Lego_White9', 'sourceMaterial': 'pasted__pasted__Lego_White9'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White12', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White12'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White15', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White15'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White16', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White16'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White19.001', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White19.001'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White11', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White11'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White15', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White15'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White16', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White16'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__Lego_White11', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__Lego_White11'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__Lego_White14', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__Lego_White14'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White26'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}, {'copiedMaterial': 'Blockrunner Ivory source V1 pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25', 'sourceMaterial': 'pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__pasted__Lego_White25'}]}

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


def verify_snapshot(snapshot):
    restore_original_context(snapshot)
    changed_scenes = [scene.name for scene, previous in snapshot['scenes'].items() if scene_record(scene) != previous]
    changed_collections = [collection.name for collection, previous in snapshot['collections'].items() if collection_record(collection) != previous]
    current_sets = datablock_sets()
    changed_ids = [name for name, previous in snapshot['sets'].items() if current_sets[name] != previous]
    result = {'contextRestored': context_record(snapshot['window']) == snapshot['context'],
              'changedScenes': changed_scenes, 'changedCollections': changed_collections,
              'changedDatablockSets': changed_ids,
              'allSceneSettingsAndMembershipsPreserved': not changed_scenes,
              'allCollectionMembershipsPreserved': not changed_collections,
              'noPersistentDatablocksCreatedOrRemoved': not changed_ids}
    return result


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

"""Own Ivory cleanup helpers. Only newly owned meshes may be reconstructed."""

def cyclic_face_key(points):
    return min(points, points[1:] + points[:1], points[2:] + points[:2])


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


def verify_live_pairs(mesh):
    assert len(mesh.polygons) == 9656 and len(mesh.vertices) == 24145, 'Own Ivory target geometry cardinality differs.'
    assert len(mesh.materials) == 1 and len(mesh.uv_layers) == 1 and len(mesh.color_attributes) == 0, 'Unexpected Ivory target material/UV/color layout.'
    assert mesh.uv_layers.active.name == 'UVMap' and mesh.shape_keys is None
    coordinates = [tuple(v.co) for v in mesh.vertices]
    uv_layer = mesh.uv_layers.active
    groups = {}
    for polygon in mesh.polygons:
        loops = list(polygon.loop_indices)
        assert len(loops) == 3 and loops == [3 * polygon.index, 3 * polygon.index + 1, 3 * polygon.index + 2]
        points = tuple(coordinates[mesh.loops[i].vertex_index] for i in loops)
        assert len(set(points)) == 3, ('Degenerate live face', polygon.index)
        a = Vector(points[1]) - Vector(points[0])
        b = Vector(points[2]) - Vector(points[0])
        assert a.cross(b).length_squared > 0, ('Collinear live face', polygon.index)
        key = tuple(sorted(points))
        if key not in groups:
            groups[key] = []
        groups[key].append(polygon.index)
    pairs = []
    for points, indices in groups.items():
        assert len(indices) == 2, ('Live pair cardinality differs', indices)
        a, b = sorted(indices)
        pa = mesh.polygons[a]
        pb = mesh.polygons[b]
        ca = tuple(coordinates[mesh.loops[i].vertex_index] for i in pa.loop_indices)
        cb = tuple(coordinates[mesh.loops[i].vertex_index] for i in pb.loop_indices)
        assert cyclic_face_key(ca) == cyclic_face_key(tuple(reversed(cb))), ('Not an exact reversed live pair', a, b)
        assert pa.material_index == pb.material_index, ('Pair material differs', a, b)
        uva = {coordinates[mesh.loops[i].vertex_index]: tuple(uv_layer.data[i].uv) for i in pa.loop_indices}
        uvb = {coordinates[mesh.loops[i].vertex_index]: tuple(uv_layer.data[i].uv) for i in pb.loop_indices}
        assert uva == uvb, ('Pair corner UV differs', a, b)
        pairs.append([a, b])
    pairs.sort()
    expected = [[2 * i, 2 * i + 1] for i in range(CLEANUP['pairCount'])]
    assert pairs == expected and fnv1a64_signature(pairs) == CLEANUP['pairsFnv'], 'Exact own live pair list differs from prepared Ivory list.'
    roles = {}
    for role, runs in CLEANUP['roleRuns'].items():
        for start, count in runs:
            for index in range(start, start + count):
                assert index not in roles, 'Overlapping semantic reference.'
                roles[index] = role
    assert len(roles) == 9656 and sum(value != 'body-remainder' for value in roles.values()) == 8256
    assert all(roles[a] == roles[b] for a, b in pairs), 'An own opposing pair crosses semantic roles.'
    return {'pairCount': len(pairs), 'pairFnv1a64': fnv1a64_signature(pairs),
            'allCoordinatesWindingMaterialAndUvVerifiedExactly': True,
            'rolesDisjointAndCoverContainer': True, 'allPairsStayWithinOneRole': True,
            'sourcePolygonsKept': [a for a, b in pairs], 'sourcePolygonsRemoved': [b for a, b in pairs]}


def rebuild_owned_mesh(mesh, original, retained):
    assert mesh is not original, 'Never reconstruct an original/source-copy mesh.'
    assert mesh not in snapshot['sets']['meshes'], 'Reconstruction refuses every preexisting mesh.'
    coordinates = [tuple(v.co) for v in original.vertices]
    edges = [tuple(e.vertices) for e in original.edges]
    edge_flags = [(e.use_seam, e.use_edge_sharp) for e in original.edges]
    faces = [tuple(original.polygons[i].vertices) for i in retained]
    requested_normals = [tuple(original.corner_normals[loop].vector) for i in retained for loop in original.polygons[i].loop_indices]
    requested_uvs = [tuple(original.uv_layers.active.data[loop].uv) for i in retained for loop in original.polygons[i].loop_indices]
    own_materials = list(mesh.materials)
    mesh.clear_geometry()
    for layer in list(mesh.uv_layers):
        mesh.uv_layers.remove(layer)
    mesh.from_pydata(coordinates, edges, faces)
    assert [tuple(v.co) for v in mesh.vertices] == coordinates, 'Retained vertex coordinates changed.'
    assert [tuple(e.vertices) for e in mesh.edges] == edges, 'Original edge index/order changed.'
    for edge, flags in zip(mesh.edges, edge_flags):
        edge.use_seam = flags[0]
        edge.use_edge_sharp = flags[1]
    mesh.materials.clear()
    for material in own_materials:
        mesh.materials.append(material)
    for polygon, source_index in zip(mesh.polygons, retained):
        old = original.polygons[source_index]
        assert tuple(polygon.vertices) == tuple(old.vertices), ('Retained polygon corner order changed', source_index)
        polygon.material_index = old.material_index
        polygon.use_smooth = old.use_smooth
    uv_layer = mesh.uv_layers.new(name='UVMap')
    for value, expected in zip(uv_layer.data, requested_uvs):
        value.uv = expected
    # Set only this new mesh's requested own Ivory authored normals. Quantify
    # Blender's encoding result; no geometric direction recalculation is called.
    mesh.normals_split_custom_set(requested_normals)
    mesh.update()
    actual_normals = [tuple(n.vector) for n in mesh.corner_normals]
    assert len(actual_normals) == len(requested_normals) == 14484
    assert [tuple(value.uv) for value in uv_layer.data] == requested_uvs, 'Retained UV values changed.'
    assert [(e.use_seam, e.use_edge_sharp) for e in mesh.edges] == edge_flags, 'Source edge seam/sharp flags changed.'
    assert [tuple(v.co) for v in mesh.vertices] == coordinates and [tuple(e.vertices) for e in mesh.edges] == edges
    assert len(mesh.polygons) == 4828 and len(mesh.vertices) == len(original.vertices)
    source_keys = {tuple(sorted(coordinates[v] for v in p.vertices)) for p in original.polygons}
    target_keys = {tuple(sorted(coordinates[v] for v in p.vertices)) for p in mesh.polygons}
    assert source_keys == target_keys, 'Unique source surface coordinate sets changed.'
    max_chord = 0.0
    max_component = 0.0
    max_angle = 0.0
    different = 0
    worst = None
    for index, pair in enumerate(zip(requested_normals, actual_normals)):
        expected, actual = pair
        component = max(abs(actual[k] - expected[k]) for k in range(3))
        chord = math.sqrt(sum((actual[k] - expected[k]) ** 2 for k in range(3)))
        length_actual = math.sqrt(sum(v * v for v in actual))
        length_expected = math.sqrt(sum(v * v for v in expected))
        assert length_actual > 0 and length_expected > 0, ('Invalid encoded normal', index)
        dot = sum(actual[k] * expected[k] for k in range(3)) / (length_actual * length_expected)
        angle = math.degrees(math.acos(max(-1.0, min(1.0, dot))))
        if component != 0:
            different += 1
        if chord > max_chord:
            worst = {'retainedLoopIndex': index, 'sourcePolygonIndex': retained[index // 3],
                     'sourceLoopIndex': 3 * retained[index // 3] + index % 3,
                     'requested': list(expected), 'actual': list(actual)}
        max_chord = max(max_chord, chord)
        max_component = max(max_component, component)
        max_angle = max(max_angle, angle)
    return {'retainedCorners': len(actual_normals), 'differentVectors': different,
            'requestedOwnNormalFnv1a64': fnv1a64_signature([list(v) for v in requested_normals]),
            'actualEncodedNormalFnv1a64': fnv1a64_signature([list(v) for v in actual_normals]),
            'maximumChordDifference': max_chord, 'maximumComponentDifference': max_component,
            'maximumAngleDegrees': max_angle, 'worstChordCorner': worst,
            'exactNormalVectorParity': actual_normals == requested_normals,
            'retainedGeometryUvSmoothAndEdgeFlagsVerified': True,
            'sourcePolygonsKeptOrderFnv1a64': fnv1a64_signature(retained),
            'sourceCornerUvFnv1a64': fnv1a64_signature([list(v) for v in requested_uvs]),
            'sourceAllVertexCoordinatesFnv1a64': fnv1a64_signature([list(v) for v in coordinates]),
            'sourceAllEdgeVerticesFnv1a64': fnv1a64_signature([list(v) for v in edges]),
            'sourceEdgeFlagsFnv1a64': fnv1a64_signature(edge_flags),
            'originalAttributes': [(a.name, a.data_type, a.domain, len(a.data)) for a in original.attributes],
            'derivedAttributes': [(a.name, a.data_type, a.domain, len(a.data)) for a in mesh.attributes],
            'normalScope': 'Own authored normal vectors requested on new derivative; measured encoding difference is separate from exact original/source-copy preservation. No Colour normal data or tolerance.'}


snapshot = fresh_snapshot()
source = None
stage = None
scratch = None
before = None
copy_before = None
report = {'stage': 'IVORY_DISPOSABLE_RETAINED_NORMAL_PREFLIGHT_V1', 'status': 'STARTED', 'preflightPassed': False,
          'sourceUid': REFERENCE['sourceUid'], 'sourceGlbSha256': REFERENCE['sourceGlbSha256'],
          'sourceCopyReceiptSha256': CLEANUP['copyReceiptSha256'],
          'cleanupInputsSha256': CLEANUP['inputsSha256'],
          'originalContext': snapshot['context'],
          'actualPreexistingDatablockCounts': {name: len(values) for name, values in snapshot['sets'].items()},
          'scope': 'One disposable mesh rebuild to measure own Ivory retained-normal encoding. No persistent derivative, masks, fit, render, export or save.',
          'persistentCleanupCreated': False, 'semanticMasksAssigned': False}
try:
    assert bpy.context.mode == 'OBJECT' and not bpy.app.is_job_running('RENDER'), 'Object mode and idle renderer required.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    stage = bpy.data.scenes.get(CLEANUP['sourceCopyScene'])
    assert source is not None and stage is not None, 'Exact original and audited source-copy scenes required.'
    require_source(source)
    maps = existing_copy_maps(source, stage)
    copy_parity(source, stage, maps[0], maps[1], maps[2])
    before = source_signature(source)
    copy_before = source_signature(stage)
    original = stage.objects.get(CLEANUP['targetCopyObject']).data
    pairs = verify_live_pairs(original)
    report['liveExactPairVerification'] = {key: value for key, value in pairs.items() if key not in {'sourcePolygonsKept', 'sourcePolygonsRemoved'}}
    scratch = original.copy()
    assert scratch not in snapshot['sets']['meshes'], 'Scratch must be newly owned.'
    report['normalReconstruction'] = rebuild_owned_mesh(scratch, original, pairs['sourcePolygonsKept'])
    report['sourceSignature'] = before
    report['sourceCopySignature'] = copy_before
    report['status'] = 'MEASURED_DISPOSABLE_RECONSTRUCTION'
except Exception as error:
    report['status'] = 'FAILED'
    report['error'] = str(error)
finally:
    try:
        if scratch is not None:
            assert scratch not in snapshot['sets']['meshes'] and scratch.users == 0, 'Refuse to remove anything except unused scratch mesh.'
            bpy.data.meshes.remove(scratch)
        report['globalPreservation'] = verify_snapshot(snapshot)
        report['sourcePreserved'] = source is not None and before is not None and source_signature(source) == before
        report['auditedSourceCopyPreserved'] = stage is not None and copy_before is not None and source_signature(stage) == copy_before
        report['sourceNormalsPreserved'] = source is not None and normal_signatures(source) == REFERENCE['cornerNormals']
        if source is not None and stage is not None and before is not None and copy_before is not None:
            maps = existing_copy_maps(source, stage)
            copy_parity(source, stage, maps[0], maps[1], maps[2])
            report['auditedCopyRawNormalsAndParityPreserved'] = True
        preservation = report['globalPreservation']
        report['preflightPassed'] = report['status'] == 'MEASURED_DISPOSABLE_RECONSTRUCTION' and report['sourcePreserved'] and report['auditedSourceCopyPreserved'] and report['sourceNormalsPreserved'] and report.get('auditedCopyRawNormalsAndParityPreserved', False) and preservation['contextRestored'] and preservation['allSceneSettingsAndMembershipsPreserved'] and preservation['allCollectionMembershipsPreserved'] and preservation['noPersistentDatablocksCreatedOrRemoved']
    except Exception as final_error:
        report['status'] = 'FAILED'
        report['finalPreservationError'] = str(final_error)
    print('IVORY_RETAINED_NORMAL_PREFLIGHT_RECEIPT_BEGIN')
    print(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False))
    print('IVORY_RETAINED_NORMAL_PREFLIGHT_RECEIPT_END')
assert report['preflightPassed'], 'Ivory disposable normal reconstruction or preservation failed.'

