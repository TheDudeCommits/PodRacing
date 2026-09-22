const cam=(eye,target=[0,4,8],fov=64,racerIndex=0)=>({eye,target,fov,racerIndex});
export const PACK=[{forward:0,lane:-3},{forward:35,lane:5},{forward:70,lane:-5},{forward:105,lane:6},{forward:-35,lane:5},{forward:-75,lane:-6},{forward:145,lane:0},{forward:-115,lane:0}];
const pace={throttle:.95,boost:false,overtake:false,weave:0,shield:false,drift:false};
const shot=(id,biome,localPod,progress,seconds,camera,extra={})=>({id,biome,localPod,progress,seconds,camera,drive:{...pace},...extra});
const solo=[{forward:0,lane:0},...Array.from({length:7},(_,i)=>({forward:-300-i*25,lane:i%2?5:-5}))];
const portrait=(id,pod,biome)=>shot(id,biome,pod,.10,1.8,cam([-24,9,27],[0,4,8],54),{endEye:[-17,7,30],formation:solo});
export const SHOTS=[
 shot('launch','desert','teemto',.035,3.5,cam([-18,14,-48],[0,4,16],70),{warm:.05,drive:{...pace,throttle:1,boost:true},formation:[{forward:0,lane:0},{forward:75,lane:5},{forward:150,lane:-5},{forward:225,lane:6},{forward:-80,lane:5},{forward:-160,lane:-6},{forward:300,lane:0},{forward:-240,lane:0}],endEye:[-12,12,-42]}),
 portrait('teemto','teemto','desert'),portrait('polwo','polwo','desert'),
 shot('desert-pack','desert','teemto',.085,3.6,cam([-10,10,-31]),{drive:{...pace,throttle:1,boost:true,overtake:true}}),
 shot('desert-drift','desert','teemto',.28,3.6,cam([36,12,-6],[0,4,9],65),{drive:{...pace,drift:true,targetLat:6},endEye:[30,10,-12]}),
 shot('frozen-wide','frozen','verdigris',.12,3.6,cam([-40,26,-43],[0,4,45],72),{endEye:[-28,18,-36]}),
 portrait('verdigris','verdigris','frozen'),portrait('skybolt','skybolt','frozen'),
 shot('frozen-boost','frozen','skybolt',.29,3.6,cam([-12,9,-30]),{drive:{...pace,boost:true},abilityAt:.4}),
 shot('frozen-hud','frozen','skybolt',.40,3.6,null,{hud:true,formation:solo,drive:{...pace,boost:true}}),
 shot('volcanic-wide','volcanic','sebulba',.30,3.6,cam([32,22,-36],[0,4,44],72)),
 portrait('sebulba','sebulba','volcanic'),portrait('blockrunner','blockrunner','volcanic'),
 shot('flame','volcanic','sebulba',.35,3.6,cam([29,10,-10],[0,4,13],66),{drive:{...pace,fire:true},abilityAt:.35,formation:[{forward:0,lane:0},{forward:25,lane:1},...PACK.slice(2)]}),
 shot('impact','volcanic','blockrunner',.52,2.8,cam([22,10,-20],[0,4,8],66,1),{drive:{...pace,fire:true},wreckAt:.65}),
 shot('jungle-wide','jungle','needle',.10,3.6,cam([-28,22,-40],[0,4,40],72),{formation:solo}),
 portrait('needle','needle','jungle'),portrait('pog','pog','jungle'),
 shot('jungle-drift','jungle','needle',.28,3.6,cam([32,13,-13],[0,4,12],66),{drive:{...pace,drift:true,targetLat:6}}),
 shot('jungle-pov','jungle','pog',.61,3.6,cam([0,11,20],[0,9,130],83),{drive:{...pace,boost:true}}),
 shot('shield','desert','teemto',.68,2.6,cam([30,10,-8],[0,4,10],66),{drive:{...pace,shield:true},shieldAt:.15}),
 shot('mine','desert','polwo',.705,2.6,cam([0,13,35],[0,3,-8],68),{drive:{...pace},mineAt:.2}),
 shot('jump','desert','teemto',.16,2.6,cam([30,18,-25],[0,4,15],70),{drive:{...pace,boost:true}}),
 shot('finish','desert','skybolt',.958,3.8,cam([-14,12,-34],[0,4,15],72),{drive:{...pace,boost:true,overtake:true}}),
];
