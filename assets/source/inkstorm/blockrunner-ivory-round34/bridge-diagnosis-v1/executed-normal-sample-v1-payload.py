"""Prepared, not executed. Read-only Ivory normal sample probe."""
import bpy
import math
import json

REFERENCE = {'sourceUid': 'e42fb924b344481ea013c58cb0f52ad7', 'sourceScene': 'PodRacing — source e42fb924b344481ea013c58cb0f52ad7 retry 20260908', 'sourceGlbSha256': '2ed231e15b8bbab3f7b7028b73e8b6f442d532c9bc4d1fc0a2f5c40aeda49576', 'auditReceiptSha256': 'f5375ba02bd017af32f833af96b2f7ccf4ab61d505acf754ee9ad48cae621079', 'objects': 55, 'meshObjects': 51, 'sampleMeshes': [{'name': 'pasted__L2x3slope2_lambert1_0', 'meshData': 'pasted__L2x3slope2_lambert1_0', 'triangles': 9656, 'expectedMeshFnv': '67fd2da0bf899610', 'expectedCornerNormalFnv': 'b966dd79e22d9b4b', 'samples': [{'glbTriangleWithinMesh': 0, 'candidateSourcePolygonIndex': 0, 'corners': [{'corner': 0, 'glbAccessorVertex': 0, 'positionBlenderBasis': [48.658538818359375, 187.81884765625, 93.06598663330078], 'normalGlbRaw': [0.0, 0.9951072335243225, 0.09880071878433228], 'normalBlenderBasis': [0.0, -0.09880071878433228, 0.9951072335243225], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 1, 'glbAccessorVertex': 1, 'positionBlenderBasis': [48.658538818359375, 172.5791015625, 91.55227661132812], 'normalGlbRaw': [0.0, 0.9951072335243225, 0.09880071878433228], 'normalBlenderBasis': [0.0, -0.09880071878433228, 0.9951072335243225], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 2, 'glbAccessorVertex': 2, 'positionBlenderBasis': [63.783538818359375, 172.5791015625, 91.55227661132812], 'normalGlbRaw': [0.0, 0.9951072335243225, 0.09880071878433228], 'normalBlenderBasis': [0.0, -0.09880071878433228, 0.9951072335243225], 'uvBlenderBasis': [0.0, 1.0]}]}, {'glbTriangleWithinMesh': 1, 'candidateSourcePolygonIndex': 1, 'corners': [{'corner': 0, 'glbAccessorVertex': 3, 'positionBlenderBasis': [63.783538818359375, 172.5791015625, 91.55227661132812], 'normalGlbRaw': [0.9857695698738098, -0.011699638329446316, -0.1676948219537735], 'normalBlenderBasis': [0.9857695698738098, 0.1676948219537735, -0.011699638329446316], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 1, 'glbAccessorVertex': 4, 'positionBlenderBasis': [48.658538818359375, 172.5791015625, 91.55227661132812], 'normalGlbRaw': [0.9857695698738098, -0.011699638329446316, -0.1676948219537735], 'normalBlenderBasis': [0.9857695698738098, 0.1676948219537735, -0.011699638329446316], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 2, 'glbAccessorVertex': 5, 'positionBlenderBasis': [48.658538818359375, 187.81884765625, 93.06598663330078], 'normalGlbRaw': [0.9857695698738098, -0.011699638329446316, -0.1676948219537735], 'normalBlenderBasis': [0.9857695698738098, 0.1676948219537735, -0.011699638329446316], 'uvBlenderBasis': [0.0, 1.0]}]}, {'glbTriangleWithinMesh': 2, 'candidateSourcePolygonIndex': 2, 'corners': [{'corner': 0, 'glbAccessorVertex': 6, 'positionBlenderBasis': [48.658538818359375, 187.81884765625, 93.06598663330078], 'normalGlbRaw': [0.0, 0.9951072335243225, 0.09880071878433228], 'normalBlenderBasis': [0.0, -0.09880071878433228, 0.9951072335243225], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 1, 'glbAccessorVertex': 7, 'positionBlenderBasis': [63.783538818359375, 172.5791015625, 91.55227661132812], 'normalGlbRaw': [0.0, 0.9951072335243225, 0.09880071878433228], 'normalBlenderBasis': [0.0, -0.09880071878433228, 0.9951072335243225], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 2, 'glbAccessorVertex': 8, 'positionBlenderBasis': [63.783538818359375, 187.81884765625, 93.06598663330078], 'normalGlbRaw': [0.0, 0.9951072335243225, 0.09880071878433228], 'normalBlenderBasis': [0.0, -0.09880071878433228, 0.9951072335243225], 'uvBlenderBasis': [0.0, 1.0]}]}, {'glbTriangleWithinMesh': 3, 'candidateSourcePolygonIndex': 3, 'corners': [{'corner': 0, 'glbAccessorVertex': 9, 'positionBlenderBasis': [63.783538818359375, 187.81884765625, 93.06598663330078], 'normalGlbRaw': [0.9857529997825623, -0.011699441820383072, -0.16779199242591858], 'normalBlenderBasis': [0.9857529997825623, 0.16779199242591858, -0.011699441820383072], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 1, 'glbAccessorVertex': 3, 'positionBlenderBasis': [63.783538818359375, 172.5791015625, 91.55227661132812], 'normalGlbRaw': [0.9857695698738098, -0.011699638329446316, -0.1676948219537735], 'normalBlenderBasis': [0.9857695698738098, 0.1676948219537735, -0.011699638329446316], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 2, 'glbAccessorVertex': 5, 'positionBlenderBasis': [48.658538818359375, 187.81884765625, 93.06598663330078], 'normalGlbRaw': [0.9857695698738098, -0.011699638329446316, -0.1676948219537735], 'normalBlenderBasis': [0.9857695698738098, 0.1676948219537735, -0.011699638329446316], 'uvBlenderBasis': [0.0, 1.0]}]}, {'glbTriangleWithinMesh': 4529, 'candidateSourcePolygonIndex': 4529, 'corners': [{'corner': 0, 'glbAccessorVertex': 11593, 'positionBlenderBasis': [10.849822998046875, 107.37158203125, 81.32438659667969], 'normalGlbRaw': [0.25119316577911377, 0.06759815663099289, 0.965573787689209], 'normalBlenderBasis': [0.25119316577911377, -0.965573787689209, 0.06759815663099289], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 1, 'glbAccessorVertex': 11594, 'positionBlenderBasis': [10.849822998046875, 107.20904541015625, 82.19788360595703], 'normalGlbRaw': [0.25119316577911377, 0.06759815663099289, 0.965573787689209], 'normalBlenderBasis': [0.25119316577911377, -0.965573787689209, 0.06759815663099289], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 2, 'glbAccessorVertex': 11595, 'positionBlenderBasis': [-4.221588134765625, 107.20904541015625, 82.19788360595703], 'normalGlbRaw': [0.25119316577911377, 0.06759815663099289, 0.965573787689209], 'normalBlenderBasis': [0.25119316577911377, -0.965573787689209, 0.06759815663099289], 'uvBlenderBasis': [0.0, 1.0]}]}, {'glbTriangleWithinMesh': 4828, 'candidateSourcePolygonIndex': 4828, 'corners': [{'corner': 0, 'glbAccessorVertex': 12130, 'positionBlenderBasis': [-4.740509033203125, 95.6033935546875, 120.88081359863281], 'normalGlbRaw': [0.0, -0.9288280010223389, -0.37051117420196533], 'normalBlenderBasis': [0.0, 0.37051117420196533, -0.9288280010223389], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 1, 'glbAccessorVertex': 12131, 'positionBlenderBasis': [-5.277374267578125, 95.0601806640625, 120.66413879394531], 'normalGlbRaw': [0.0, -0.9288280010223389, -0.37051117420196533], 'normalBlenderBasis': [0.0, 0.37051117420196533, -0.9288280010223389], 'uvBlenderBasis': [0.0, 1.0]}, {'corner': 2, 'glbAccessorVertex': 12132, 'positionBlenderBasis': [-7.911407470703125, 99.04827880859375, 122.25472259521484], 'normalGlbRaw': [0.0, -0.9288280010223389, -0.37051117420196533], 'normalBlenderBasis': [0.0, 0.37051117420196533, -0.9288280010223389], 'uvBlenderBasis': [0.0, 1.0]}]}]}, {'name': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'meshData': 'pasted__L2x3slope2_pasted__Lego_White7_0', 'triangles': 3768, 'expectedMeshFnv': '66dc0b0d8f903183', 'expectedCornerNormalFnv': '1bc2b25fe6fda29e', 'samples': [{'glbTriangleWithinMesh': 0, 'candidateSourcePolygonIndex': 0, 'corners': [{'corner': 0, 'glbAccessorVertex': 0, 'positionBlenderBasis': [-88.85537719726562, -252.08648681640625, 41.1558952331543], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.6240910291671753, 0.9340220093727112]}, {'corner': 1, 'glbAccessorVertex': 1, 'positionBlenderBasis': [-87.82144165039062, -252.08648681640625, 39.12653350830078], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.6458770036697388, 0.8912630081176758]}, {'corner': 2, 'glbAccessorVertex': 2, 'positionBlenderBasis': [-94.74502563476562, -252.08648681640625, 36.87688446044922], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.5000010132789612, 0.8500000238418579]}]}, {'glbTriangleWithinMesh': 1, 'candidateSourcePolygonIndex': 1, 'corners': [{'corner': 0, 'glbAccessorVertex': 3, 'positionBlenderBasis': [-90.46597290039062, -252.08648681640625, 42.76644515991211], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.5901569724082947, 0.9679549932479858]}, {'corner': 1, 'glbAccessorVertex': 0, 'positionBlenderBasis': [-88.85537719726562, -252.08648681640625, 41.1558952331543], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.6240910291671753, 0.9340220093727112]}, {'corner': 2, 'glbAccessorVertex': 2, 'positionBlenderBasis': [-94.74502563476562, -252.08648681640625, 36.87688446044922], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.5000010132789612, 0.8500000238418579]}]}, {'glbTriangleWithinMesh': 2, 'candidateSourcePolygonIndex': 2, 'corners': [{'corner': 0, 'glbAccessorVertex': 4, 'positionBlenderBasis': [-92.49539184570312, -252.08648681640625, 43.80050277709961], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.5473989844322205, 0.9897419810295105]}, {'corner': 1, 'glbAccessorVertex': 3, 'positionBlenderBasis': [-90.46597290039062, -252.08648681640625, 42.76644515991211], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.5901569724082947, 0.9679549932479858]}, {'corner': 2, 'glbAccessorVertex': 2, 'positionBlenderBasis': [-94.74502563476562, -252.08648681640625, 36.87688446044922], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.5000010132789612, 0.8500000238418579]}]}, {'glbTriangleWithinMesh': 3, 'candidateSourcePolygonIndex': 3, 'corners': [{'corner': 0, 'glbAccessorVertex': 5, 'positionBlenderBasis': [-94.74502563476562, -252.08648681640625, 44.15681838989258], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.5, 0.9972490072250366]}, {'corner': 1, 'glbAccessorVertex': 4, 'positionBlenderBasis': [-92.49539184570312, -252.08648681640625, 43.80050277709961], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.5473989844322205, 0.9897419810295105]}, {'corner': 2, 'glbAccessorVertex': 2, 'positionBlenderBasis': [-94.74502563476562, -252.08648681640625, 36.87688446044922], 'normalGlbRaw': [0.0, 0.0, -1.0], 'normalBlenderBasis': [0.0, 1.0, 0.0], 'uvBlenderBasis': [0.5000010132789612, 0.8500000238418579]}]}, {'glbTriangleWithinMesh': 540, 'candidateSourcePolygonIndex': 540, 'corners': [{'corner': 0, 'glbAccessorVertex': 669, 'positionBlenderBasis': [-79.44229125976562, -235.17529296875, 1.2265640497207642], 'normalGlbRaw': [0.703598141670227, 0.0003999989421572536, -0.7105981707572937], 'normalBlenderBasis': [0.703598141670227, 0.7105981707572937, 0.0003999989421572536], 'uvBlenderBasis': [0.6224960088729858, 0.9957910180091858]}, {'corner': 1, 'glbAccessorVertex': 670, 'positionBlenderBasis': [-79.75161743164062, -234.8721923828125, 1.2327264547348022], 'normalGlbRaw': [0.703598141670227, 0.0003999989421572536, -0.7105981707572937], 'normalBlenderBasis': [0.703598141670227, 0.7105981707572937, 0.0003999989421572536], 'uvBlenderBasis': [0.6262829899787903, 0.9957060217857361]}, {'corner': 2, 'glbAccessorVertex': 48, 'positionBlenderBasis': [-79.75808715820312, -234.8721923828125, 10.78709888458252], 'normalGlbRaw': [0.29430556297302246, 0.5118097066879272, -0.8071153163909912], 'normalBlenderBasis': [0.29430556297302246, 0.8071153163909912, 0.5118097066879272], 'uvBlenderBasis': [0.6263099908828735, 0.7543829679489136]}]}, {'glbTriangleWithinMesh': 20, 'candidateSourcePolygonIndex': 20, 'corners': [{'corner': 0, 'glbAccessorVertex': 21, 'positionBlenderBasis': [-94.17886352539062, -266.414794921875, 37.06084442138672], 'normalGlbRaw': [0.6683034896850586, 0.21710112690925598, 0.7115037441253662], 'normalBlenderBasis': [0.6683034896850586, -0.7115037441253662, 0.21710112690925598], 'uvBlenderBasis': [0.6458770036697388, 0.10896599292755127]}, {'corner': 1, 'glbAccessorVertex': 22, 'positionBlenderBasis': [-94.26333618164062, -266.414794921875, 37.226844787597656], 'normalGlbRaw': [0.5685188174247742, 0.41311368346214294, 0.7114235758781433], 'normalBlenderBasis': [0.5685188174247742, -0.7114235758781433, 0.41311368346214294], 'uvBlenderBasis': [0.6240910291671753, 0.06620800495147705]}, {'corner': 2, 'glbAccessorVertex': 23, 'positionBlenderBasis': [-94.74502563476562, -266.414794921875, 36.8769416809082], 'normalGlbRaw': [0.0, 0.0, 1.0], 'normalBlenderBasis': [0.0, -1.0, 0.0], 'uvBlenderBasis': [0.5000010132789612, 0.1625000238418579]}]}]}, {'name': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'meshData': 'pasted__L2x3slope2_pasted__LegoWhite3_0', 'triangles': 240, 'expectedMeshFnv': '2147053ec36150df', 'expectedCornerNormalFnv': '3c4611f43d131b62', 'samples': [{'glbTriangleWithinMesh': 0, 'candidateSourcePolygonIndex': 0, 'corners': [{'corner': 0, 'glbAccessorVertex': 0, 'positionBlenderBasis': [-9.248870849609375, 67.57769775390625, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.06933312863111496, 0.42144984006881714]}, {'corner': 1, 'glbAccessorVertex': 1, 'positionBlenderBasis': [-10.225799560546875, 68.5545654296875, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.05612242594361305, 0.4082403779029846]}, {'corner': 2, 'glbAccessorVertex': 2, 'positionBlenderBasis': [-11.560150146484375, 66.24322509765625, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.038080211728811264, 0.43949395418167114]}]}, {'glbTriangleWithinMesh': 1, 'candidateSourcePolygonIndex': 1, 'corners': [{'corner': 0, 'glbAccessorVertex': 1, 'positionBlenderBasis': [-10.225799560546875, 68.5545654296875, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.05612242594361305, 0.4082403779029846]}, {'corner': 1, 'glbAccessorVertex': 3, 'positionBlenderBasis': [-11.560150146484375, 68.912109375, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.038080211728811264, 0.40340572595596313]}, {'corner': 2, 'glbAccessorVertex': 2, 'positionBlenderBasis': [-11.560150146484375, 66.24322509765625, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.038080211728811264, 0.43949395418167114]}]}, {'glbTriangleWithinMesh': 2, 'candidateSourcePolygonIndex': 2, 'corners': [{'corner': 0, 'glbAccessorVertex': 3, 'positionBlenderBasis': [-11.560150146484375, 68.912109375, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.038080211728811264, 0.40340572595596313]}, {'corner': 1, 'glbAccessorVertex': 4, 'positionBlenderBasis': [-12.894622802734375, 68.5545654296875, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.02003549598157406, 0.4082403779029846]}, {'corner': 2, 'glbAccessorVertex': 2, 'positionBlenderBasis': [-11.560150146484375, 66.24322509765625, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.038080211728811264, 0.43949395418167114]}]}, {'glbTriangleWithinMesh': 3, 'candidateSourcePolygonIndex': 3, 'corners': [{'corner': 0, 'glbAccessorVertex': 4, 'positionBlenderBasis': [-12.894622802734375, 68.5545654296875, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.02003549598157406, 0.4082403779029846]}, {'corner': 1, 'glbAccessorVertex': 5, 'positionBlenderBasis': [-13.871551513671875, 67.57769775390625, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.0068260435946285725, 0.42144984006881714]}, {'corner': 2, 'glbAccessorVertex': 2, 'positionBlenderBasis': [-11.560150146484375, 66.24322509765625, 81.18463897705078], 'normalGlbRaw': [0.0, 1.0, 0.0], 'normalBlenderBasis': [0.0, -0.0, 1.0], 'uvBlenderBasis': [0.038080211728811264, 0.43949395418167114]}]}, {'glbTriangleWithinMesh': 172, 'candidateSourcePolygonIndex': 172, 'corners': [{'corner': 0, 'glbAccessorVertex': 248, 'positionBlenderBasis': [-25.464935302734375, 79.3304443359375, 74.55951690673828], 'normalGlbRaw': [0.7111945152282715, -0.0010999914957210422, 0.7029945850372314], 'normalBlenderBasis': [0.7111945152282715, -0.7029945850372314, -0.0010999914957210422], 'uvBlenderBasis': [0.326084166765213, 0.5792099833488464]}, {'corner': 1, 'glbAccessorVertex': 249, 'positionBlenderBasis': [-25.158050537109375, 79.64459228515625, 74.55229949951172], 'normalGlbRaw': [0.7111945152282715, -0.0010999914957210422, 0.7029945850372314], 'normalBlenderBasis': [0.7111945152282715, -0.7029945850372314, -0.0010999914957210422], 'uvBlenderBasis': [0.32598626613616943, 0.5834566950798035]}, {'corner': 2, 'glbAccessorVertex': 26, 'positionBlenderBasis': [-25.149261474609375, 79.64459228515625, 77.8183364868164], 'normalGlbRaw': [0.08170117437839508, -0.6646095514297485, 0.7427106499671936], 'normalBlenderBasis': [0.08170117437839508, -0.7427106499671936, -0.6646095514297485], 'uvBlenderBasis': [0.3701486885547638, 0.5834566950798035]}]}, {'glbTriangleWithinMesh': 12, 'candidateSourcePolygonIndex': 12, 'corners': [{'corner': 0, 'glbAccessorVertex': 13, 'positionBlenderBasis': [-26.691864013671875, 51.4716796875, 79.87882995605469], 'normalGlbRaw': [-0.780592679977417, 0.594594419002533, 0.1926981806755066], 'normalBlenderBasis': [-0.780592679977417, -0.1926981806755066, 0.594594419002533], 'uvBlenderBasis': [0.495436429977417, 0.9940986037254333]}, {'corner': 1, 'glbAccessorVertex': 14, 'positionBlenderBasis': [-26.376312255859375, 51.15594482421875, 79.87882995605469], 'normalGlbRaw': [-0.10240405052900314, 0.6511257290840149, 0.7520297169685364], 'normalBlenderBasis': [-0.10240405052900314, -0.7520297169685364, 0.6511257290840149], 'uvBlenderBasis': [0.495436429977417, 0.9983672499656677]}, {'corner': 2, 'glbAccessorVertex': 15, 'positionBlenderBasis': [-26.376312255859375, 51.4716796875, 80.19449615478516], 'normalGlbRaw': [-0.26389336585998535, 0.8003798723220825, 0.5382864475250244], 'normalBlenderBasis': [-0.26389336585998535, -0.5382864475250244, 0.8003798723220825], 'uvBlenderBasis': [0.4997048079967499, 0.9940986037254333]}]}]}]}

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


def selected_mesh_guard(source):
    result = {}
    for reference in REFERENCE['sampleMeshes']:
        ob = source.objects.get(reference['name'])
        assert ob is not None and ob.type == 'MESH', ('Missing sample mesh', reference['name'])
        assert ob.data.name == reference['meshData'], ('Mesh datablock differs', ob.name)
        assert len(ob.modifiers) == 0 and len(ob.constraints) == 0, ('Unexpected modifier/constraint', ob.name)
        assert len(ob.data.polygons) == reference['triangles'], ('Polygon count changed', ob.name)
        assert all(len(p.vertices) == 3 for p in ob.data.polygons), ('Non-triangle source polygon', ob.name)
        mesh_fnv = mesh_signature(ob.data)
        normal_fnv = fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
        assert mesh_fnv == reference['expectedMeshFnv'], ('Geometry changed since actual audit', ob.name)
        assert normal_fnv == reference['expectedCornerNormalFnv'], ('Normals changed since actual audit', ob.name)
        result[ob.name] = {'meshFnv1a64': mesh_fnv, 'cornerNormalsFnv1a64': normal_fnv}
    return result


def sample_values(source):
    result = []
    for reference in REFERENCE['sampleMeshes']:
        ob = source.objects.get(reference['name'])
        mesh = ob.data
        uv_layer = mesh.uv_layers.active
        assert uv_layer is not None, ('Missing UV layer', ob.name)
        triangles = []
        for sample in reference['samples']:
            polygon = mesh.polygons[sample['candidateSourcePolygonIndex']]
            assert len(polygon.loop_indices) == 3, ('Non-triangle polygon', ob.name, polygon.index)
            corners = []
            for ci, loop in enumerate(polygon.loop_indices):
                vi = mesh.loops[loop].vertex_index
                position = list(mesh.vertices[vi].co)
                normal = list(mesh.corner_normals[loop].vector)
                uv = list(uv_layer.data[loop].uv)
                expected = sample['corners'][ci]
                position_matches = [round(v, 6) for v in position] == [round(v, 6) for v in expected['positionBlenderBasis']]
                uv_matches = [round(v, 6) for v in uv] == [round(v, 6) for v in expected['uvBlenderBasis']]
                assert position_matches and uv_matches, ('Ordered position/UV mismatch', ob.name, polygon.index, ci)
                normal_length = math.sqrt(sum(v * v for v in normal))
                expected_normal = expected['normalBlenderBasis']
                expected_length = math.sqrt(sum(v * v for v in expected_normal))
                dot = sum(normal[k] * expected_normal[k] for k in range(3)) / (normal_length * expected_length)
                corners.append({'corner': ci, 'loopIndex': loop, 'vertexIndex': vi,
                                'position': position, 'normal': normal, 'uv': uv, 'expectedGlbCorner': expected,
                                'normalComponentDifference': [normal[k] - expected_normal[k] for k in range(3)],
                                'normalLength': normal_length, 'glbNormalLength': expected_length,
                                'normalAngleDegrees': math.degrees(math.acos(max(-1.0, min(1.0, dot)))),
                                'positionMatchesAt6Decimals': position_matches, 'uvMatchesAt6Decimals': uv_matches})
            triangles.append({'glbTriangleWithinMesh': sample['glbTriangleWithinMesh'],
                              'candidateSourcePolygonIndex': polygon.index,
                              'polygonNormal': list(polygon.normal), 'useSmooth': polygon.use_smooth, 'corners': corners})
        result.append({'name': ob.name, 'meshData': mesh.name, 'hasCustomNormals': mesh.has_custom_normals,
                       'matrixLocal': matrix_rows(ob.matrix_local), 'matrixWorld': matrix_rows(ob.matrix_world), 'triangles': triangles})
    return result


snapshot = fresh_snapshot()
source = None
before = None
samples_before = None
report = {'stage': 'IVORY_BOUNDED_NORMAL_SAMPLE_V1', 'status': 'STARTED',
          'sourceUid': REFERENCE['sourceUid'], 'sourceScene': REFERENCE['sourceScene'],
          'sourceGlbSha256': REFERENCE['sourceGlbSha256'], 'auditReceiptSha256': REFERENCE['auditReceiptSha256'],
          'scope': 'Read-only54 corners in3 audited Ivory meshes. No scene switch, evaluation, import, mask, edit, render, save or nearest search.',
          'originalContext': snapshot['context'],
          'freshAllSceneSnapshot': [value for scene, value in snapshot['scenes'].items()],
          'freshAllCollectionSnapshot': [value for collection, value in snapshot['collections'].items()],
          'actualPreexistingDatablockCounts': {name: len(value) for name, value in snapshot['sets'].items()},
          'semanticMasksAssigned': False, 'wholeBridgeResolved': False, 'samplePassed': False}
try:
    assert bpy.context.mode == 'OBJECT', 'Object mode required.'
    assert not bpy.app.is_job_running('RENDER'), 'Separate render owner must release Blender first.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    assert source is not None, 'Exact Ivory source scene missing.'
    assert len(source.objects) == REFERENCE['objects'], 'Ivory object count changed.'
    assert sum(ob.type == 'MESH' for ob in source.objects) == REFERENCE['meshObjects'], 'Ivory mesh count changed.'
    before = selected_mesh_guard(source)
    samples_before = sample_values(source)
    report['samples'] = samples_before
    report['sampleMeshGuard'] = before
    report['status'] = 'SAMPLED'
except Exception as error:
    report['status'] = 'FAILED'
    report['error'] = str(error)
finally:
    try:
        if source is not None and before is not None:
            report['sampledSourcePreserved'] = selected_mesh_guard(source) == before
            if samples_before is not None:
                report['rawSamplesPreserved'] = sample_values(source) == samples_before
        report['globalPreservation'] = verify_snapshot(snapshot)
        preservation = report['globalPreservation']
        report['samplePassed'] = report['status'] == 'SAMPLED' and report.get('sampledSourcePreserved', False) and report.get('rawSamplesPreserved', False) and preservation['contextRestored'] and preservation['allSceneSettingsAndMembershipsPreserved'] and preservation['allCollectionMembershipsPreserved'] and preservation['noPersistentDatablocksCreatedOrRemoved']
    except Exception as error:
        report['status'] = 'FAILED'
        report['preservationError'] = str(error)
    print('IVORY_BOUNDED_NORMAL_SAMPLE_RECEIPT_BEGIN')
    print(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False))
    print('IVORY_BOUNDED_NORMAL_SAMPLE_RECEIPT_END')
assert report['samplePassed'], 'Bounded normal sampling or preservation failed; no masks may be assigned.'
