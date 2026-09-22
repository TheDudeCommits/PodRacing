export default async ({project,rect,text}) => {
 const p=await project({dir:"/home/user/podracing-v5-title",size:"1920x1080",fps:60,background:"#090d12"});
 const display=await p.add("/home/user/BlackOpsOne-Regular.ttf");
 const small=await p.add("/home/user/ChakraPetch-Bold.ttf");
 const fade=(at,dur)=>[{property:"opacity",from:0,to:1,at,duration:dur}];
 const tx=(s,y,size,color,extra={})=>text(s,{x:120,y,width:1680,height:size*1.6,fontSize:size,color,align:"center",typography:{fontAssetId:display.id},...extra});
 p.compose([
  rect({x:0,y:0,width:1920,height:1080,fill:"#090d12"}),
  rect({x:0,y:490,width:1920,height:100,fill:"#101923"}),
  rect({x:420,y:692,width:1080,height:3,fill:"#e76a38",animate:[{property:"scaleX",from:0,to:1,duration:.55}]}),
  tx("NOW THIS IS",280,54,"#e7cdb5",{letterSpacing:9,animate:fade(.1,.35)}),
  tx("PODRACING",368,156,"#ffdfbf",{letterSpacing:2,animate:[...fade(.05,.2),{property:"offsetY",from:28,to:0,duration:.6}]}),
  tx("EIGHT PODS.  ONE CIRCUIT.  YOUR LINE.",602,26,"#e76a38",{typography:{fontAssetId:small.id},letterSpacing:5,animate:fade(.3,.4)}),
 ],{at:0,dur:4,name:"Main title"});
 p.compose([
  rect({x:0,y:0,width:1920,height:1080,fill:"#090d12"}),
  tx("PODRACING",280,104,"#ffdfbf"),
  tx("PLAY FREE IN YOUR BROWSER",460,31,"#ead5c0",{typography:{fontAssetId:small.id},letterSpacing:7}),
  tx("podracing.dude.work",541,58,"#ef7b48",{typography:{fontAssetId:small.id},letterSpacing:3}),
  rect({x:665,y:656,width:590,height:2,fill:"#ef7b48"}),
  tx("'Race The Sun' by Scott Buckley | CC BY 4.0 | www.scottbuckley.com.au",881,19,"#8a939b",{typography:{fontAssetId:small.id}}),
  tx("Includes AI cinematic inserts. Gameplay captured in-engine.",922,18,"#8a939b",{typography:{fontAssetId:small.id}}),
 ],{at:4,dur:4,name:"Playable URL and credits"});
 await p.frame(2,"/home/user/title-preview.png");
 await p.render("/home/user/podracing-v5-title.mp4",{bitrate:8000000,accel:"cpu"});
};
