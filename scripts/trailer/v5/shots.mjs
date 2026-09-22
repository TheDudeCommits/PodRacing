const cam=(eye,target=[0,4,8],fov=64,racerIndex=0)=>({eye,target,fov,racerIndex});
export const PACK=[{forward:0,lane:-4},{forward:36,lane:6},{forward:77,lane:-6},{forward:112,lane:7},{forward:-42,lane:5},{forward:-85,lane:-6},{forward:152,lane:0},{forward:-125,lane:0}];
const pace={throttle:.94,boost:false,overtake:false,weave:0,shield:false,drift:false};
export const SHOTS=[
{id:'01-grid',progress:.018,seconds:3,warm:0,stationary:true,drive:{...pace,throttle:0},camera:cam([-70,30,65],[0,3,-28],58),endEye:[-62,24,59]},
{id:'02-teemto',progress:.09,seconds:3,warm:.5,drive:pace,camera:cam([-39,10,26],[0,4,0],57),endEye:[-35,8,18]},
{id:'03-polwo',progress:.11,seconds:3,warm:.5,drive:pace,camera:cam([-35,10,26],[0,4,0],58,1)},
{id:'04-sebulba',progress:.72,seconds:3,warm:.6,drive:pace,camera:cam([-39,8,28],[0,4,0],56,3)},
{id:'05-blockrunner',progress:.68,seconds:3,warm:.5,drive:pace,camera:cam([-41,11,25],[0,4,0],57,4)},
{id:'06-launch',progress:.012,seconds:4,warm:0,stationary:true,drive:{...pace,throttle:1,boost:true},camera:cam([-10,10,-35],[0,3,24],72),endEye:[-5,8,-28]},
{id:'07-pack-chase',progress:.085,seconds:4,warm:.5,drive:{...pace,boost:true,overtake:true},camera:cam([-5,9,-30],[0,5,25],72)},
{id:'08-pack-pov',progress:.085,seconds:4,warm:.5,drive:{...pace,boost:true,overtake:true},camera:cam([0,9,-11],[0,6,100],91)},
{id:'09-drift-side',progress:.28,seconds:4,warm:.6,drive:{...pace,drift:true,throttle:.96},camera:cam([38,13,-8],[0,4,8],61)},
{id:'10-drift-chase',progress:.315,seconds:3.5,warm:.6,drive:{...pace,drift:true},camera:cam([-5,11,-32],[0,3,21],72)},
{id:'11-lance',progress:.35,seconds:4,warm:.2,drive:{...pace,fire:true,throttle:.91},camera:cam([-8,11,-28],[0,4,45],68)},
{id:'12-shield',progress:.68,seconds:3,warm:.4,drive:{...pace,shield:true,forceShield:true},camera:cam([-38,11,24],[0,4,5],58)},
{id:'13-rear-mine',progress:.705,seconds:4,warm:.4,drive:{...pace,mine:true},formation:PACK.map((p,i)=>({forward:i===0?0:-40*i,lane:i%2?-5:5})),camera:cam([0,14,0],[0,1,-70],78)},
{id:'14-tow',progress:.29,seconds:5,warm:0,drive:{...pace,targetLat:-8,throttle:.94},formation:PACK.map((p,i)=>({...p,lane:i<2?-8:p.lane})),tow:true,camera:cam([21,16,-34],[0,3,42],72)},
{id:'15-wreck',progress:.69,seconds:3.5,warm:.4,drive:pace,camera:cam([-43,17,-15],[0,3,20],66),wreckAt:1.1},
{id:'16-arch',progress:.431,seconds:4,warm:.3,drive:{...pace,boost:true},camera:cam([0,10,-13],[0,5,110],90)},
{id:'17-foundry',progress:.582,seconds:4,warm:.4,drive:{...pace,boost:true,fire:true},camera:cam([-5,11,-29],[0,4,38],74)},
{id:'18-foundry-pov',progress:.585,seconds:3,warm:.4,drive:{...pace,boost:true},camera:cam([0,10,-12],[0,5,110],92)},
{id:'19-jump',progress:.16,seconds:4,warm:.3,drive:{...pace,throttle:1,boost:true},camera:cam([-39,15,-6],[0,3,7],65)},
{id:'20-sunset-sprint',progress:.74,seconds:4,warm:.5,drive:{...pace,throttle:1,boost:true},camera:cam([-5,10,-31],[0,4,40],77)},
{id:'21-finish',progress:.968,seconds:4,warm:.2,drive:{...pace,throttle:1,boost:true},camera:cam([-6,10,-28],[0,4,35],78)},
{id:'22-pilot',progress:.085,seconds:2,warm:.4,drive:pace,camera:cam([-7,7,-10],[0,4,-8],53)},
// Focused portraits use each selectable pod as the real player with its own handling tune.
...['teemto','polwo','sebulba','blockrunner'].map((pod,i)=>({
 id:`p${i+1}-${pod}`,localPod:pod,progress:.072,seconds:3,warm:.45,
 formation:PACK.map((p,j)=>({forward:j===0?0:-400-j*10,lane:j===0?0:p.lane})),
 drive:{...pace,throttle:.92},camera:cam([-33,9,23],[0,4,0],57),endEye:[-31,8,17]
})),
{id:'23-hud',progress:.09,seconds:4,warm:.4,hud:true,drive:{...pace,boost:true,fire:true},camera:null},
{id:'24-mine',progress:.706,seconds:4,warm:.3,mineAt:.5,drive:{...pace,mine:false},formation:PACK.map((p,i)=>({forward:i===0?0:-40*i,lane:i%2?-5:5})),camera:cam([0,14,0],[0,1,-70],78)},
{id:'25-shield',progress:.68,seconds:3,warm:.4,shieldAt:.45,drive:{...pace,shield:true},camera:cam([-31,10,21],[0,4,3],57)},
{id:'26-tow',progress:.678,seconds:4,warm:0,tow:true,drive:{...pace,targetLat:8,throttle:.94},formation:PACK.map((p,i)=>({forward:i===0?0:i===1?43:-400-i*10,lane:i===0?8:-7})),camera:cam([24,17,-27],[0,3,30],70)},
{id:'27-impact',progress:.70,seconds:3.5,warm:.35,drive:pace,camera:cam([-35,15,-15],[0,3,7],62,1),wreckAt:.65},
];
