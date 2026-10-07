import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export type Actor={root:THREE.Group;body:THREE.Group;leftArm:THREE.Group;rightArm:THREE.Group;leftLeg:THREE.Group;rightLeg:THREE.Group;head:THREE.Group;weapon?:THREE.Group;kind:string;restY:number};
const textures=new Map<string,THREE.CanvasTexture>();
export const groundImages:{cobble?:HTMLImageElement;meadow?:HTMLImageElement}={};
export async function preloadArt(){
  await Promise.all((['cobble','meadow'] as const).map(key=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>{groundImages[key]=img;resolve();};img.onerror=()=>reject(new Error('No se pudo cargar la textura '+key));img.src=`/assets/${key==='cobble'?'aurelia-cobblestone':'greenfields-meadow'}.png`;})));
}
let seed=82;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function texture(kind:string){
  if(textures.has(kind))return textures.get(kind)!;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;
  const palettes:Record<string,string[]>={stone:['#79796b','#505448','#999584'],wood:['#61442f','#352a23','#896446'],roof:['#453e36','#6d5744','#8a6d52'],bark:['#413d2b','#292e23','#777254'],steel:['#a4aaa3','#525d59','#d2c7a0'],cloth:['#284d49','#162f2d','#426762'],leather:['#594239','#312b28','#81654b']};
  const p=palettes[kind]??palettes.stone;c.fillStyle=p[0];c.fillRect(0,0,256,256);
  for(let i=0;i<3500;i++){c.fillStyle=p[i%3];c.globalAlpha=0.05+rand()*0.16;c.fillRect(rand()*256,rand()*256,rand()*3+1,kind==='wood'||kind==='bark'?rand()*70:rand()*4+1);}
  c.globalAlpha=1;
  if(kind==='stone'||kind==='roof'){
    const h=kind==='stone'?64:32,w=kind==='stone'?96:48;
    for(let y=0;y<256;y+=h)for(let x=-(y/h%2)*w/2;x<256;x+=w){c.strokeStyle='#242c25';c.lineWidth=3;c.strokeRect(x+1,y+1,w-3,h-3);c.strokeStyle='#cbc0a0';c.globalAlpha=0.14;c.lineWidth=1;c.beginPath();c.moveTo(x+3,y+3);c.lineTo(x+w-4,y+3);c.stroke();c.globalAlpha=1;}
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;textures.set(kind,t);return t;
}
const materials=new Map<string,THREE.MeshLambertMaterial|THREE.MeshPhongMaterial>();
export function material(color:string,kind?:string,metal=0){const key=`${color}:${kind}:${metal}`;if(!materials.has(key))materials.set(key,metal?new THREE.MeshPhongMaterial({color,map:kind?texture(kind):null,specular:'#737d74',shininess:22}):new THREE.MeshLambertMaterial({color,map:kind?texture(kind):null}));return materials.get(key)!;}
export function mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function box(parent:THREE.Object3D,w:number,h:number,d:number,mat:THREE.Material,x=0,y=0,z=0){return mesh(parent,new THREE.BoxGeometry(w,h,d),mat,x,y,z);}
export function ellipsoid(parent:THREE.Object3D,rx:number,ry:number,rz:number,mat:THREE.Material,x=0,y=0,z=0,segments=12){const m=mesh(parent,new THREE.SphereGeometry(1,segments,8),mat,x,y,z);m.scale.set(rx,ry,rz);return m;}
function limb(parent:THREE.Object3D,x:number,y:number,z:number,length:number,radius:number,mat:THREE.Material){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);mesh(g,new THREE.CylinderGeometry(radius*0.85,radius,length,10),mat,0,-length/2,0);return g;}
export function sword(parent:THREE.Object3D){const g=new THREE.Group();parent.add(g);const shape=new THREE.Shape();shape.moveTo(-0.085,0);shape.lineTo(-0.095,0.88);shape.lineTo(0,1.12);shape.lineTo(0.095,0.88);shape.lineTo(0.085,0);shape.closePath();mesh(g,new THREE.ExtrudeGeometry(shape,{depth:0.035,bevelEnabled:true,bevelThickness:0.012,bevelSize:0.012,bevelSegments:1,steps:1}),material('#c4c7b8','steel',0.7));box(g,0.43,0.07,0.1,material('#a79563','steel',0.55),0,-0.03,0);mesh(g,new THREE.CylinderGeometry(0.045,0.045,0.25,8),material('#4a352a','leather'),0,-0.18,0);ellipsoid(g,0.065,0.06,0.05,material('#ba9b5e','steel',0.6),0,-0.34,0);return g;}
export function human(kind='vanguard'):Actor{
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.position.y=1.02;
  const steel=material('#c5cbbb','steel',0.38),dark=material('#869080','steel',0.35),leather=material('#79604a','leather'),skin=material('#c89f7b'),cloth=material(kind==='merchant'?'#537d77':'#436863','cloth');
  const armor=kind==='vanguard'?steel:leather;
  const points=[new THREE.Vector2(0.2,-0.08),new THREE.Vector2(0.25,0.05),new THREE.Vector2(0.31,0.36),new THREE.Vector2(0.32,0.56),new THREE.Vector2(0.16,0.65)];
  const torso=mesh(body,new THREE.LatheGeometry(points,12),armor);torso.scale.z=0.62;
  box(body,0.48,0.1,0.29,leather,0,0.08,0);box(body,0.075,0.075,0.035,material('#bfa363','steel',0.5),0,0.08,0.17);
  if(kind==='vanguard'){
    for(const x of [-0.15,0.15]){const plate=box(body,0.25,0.32,0.09,dark,x,0.39,0.185);plate.rotation.z=-x*0.6;}
    box(body,0.06,0.36,0.025,material('#ad9763','steel',0.5),0,0.4,0.26);
    const cape=mesh(body,new THREE.ConeGeometry(0.34,0.87,5,1,true),cloth,0,0.09,-0.21);cape.scale.z=0.32;cape.rotation.x=-0.13;
  }else{box(body,0.5,0.75,0.025,cloth,0,0.1,0.22);}
  const head=new THREE.Group();head.position.set(0,0.78,0);body.add(head);
  mesh(head,new THREE.CylinderGeometry(0.09,0.1,0.13,10),skin,0,-0.1,0);
  ellipsoid(head,0.145,0.2,0.14,skin,0,0.09,0.02,16);
  ellipsoid(head,0.153,0.15,0.147,material(kind==='merchant'?'#4d3025':'#332d26'),0,0.18,-0.035);
  box(head,0.24,0.065,0.07,material('#3c3026'),0,0.18,0.11);
  box(head,0.045,0.06,0.08,skin,0,0.06,0.155);
  for(const x of [-0.055,0.055]){box(head,0.028,0.018,0.016,material('#1e2521'),x,0.105,0.148);box(head,0.05,0.012,0.02,material('#3f332b'),x,0.135,0.14);}
  if(kind!=='merchant')ellipsoid(head,0.104,0.06,0.09,material('#45362c'),0,-0.055,0.086);
  const leftArm=limb(body,-0.38,0.54,0,0.42,0.105,armor),rightArm=limb(body,0.38,0.54,0,0.42,0.105,armor);
  for(const [arm,sign] of [[leftArm,-1],[rightArm,1]] as const){ellipsoid(arm,0.17,0.13,0.18,armor,0,-0.015,0);const forearm=limb(arm,0,-0.38,0.035,0.35,0.085,kind==='vanguard'?dark:skin);forearm.rotation.x=-0.13;ellipsoid(arm,0.085,0.09,0.065,leather,0,-0.76,0.075);arm.rotation.z=sign*-0.12;}
  const leftLeg=limb(body,-0.16,-0.04,0,0.44,0.115,leather),rightLeg=limb(body,0.16,-0.04,0,0.44,0.115,leather);
  for(const leg of [leftLeg,rightLeg]){mesh(leg,new THREE.CylinderGeometry(0.10,0.085,0.4,10),kind==='vanguard'?dark:leather,0,-0.67,0);box(leg,0.18,0.14,0.32,leather,0,-0.93,0.08);if(kind==='vanguard')ellipsoid(leg,0.11,0.14,0.085,steel,0,-0.43,0.065);}
  let weapon:THREE.Group|undefined;
  if(kind==='vanguard'){weapon=sword(rightArm);weapon.position.set(0,-0.72,0.14);weapon.rotation.x=Math.PI*0.6;}
  if(kind==='blacksmith'){const hammer=new THREE.Group();rightArm.add(hammer);hammer.position.set(0,-0.76,0.1);box(hammer,0.045,0.5,0.05,leather);box(hammer,0.35,0.14,0.15,dark,0,0.25,0);}
  root.userData.kind=kind;return{root,body,leftArm,rightArm,leftLeg,rightLeg,head,weapon,kind,restY:1.02};
}
export function sproutling():Actor{
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.position.y=0.82;
  const bark=material('#777b4b','bark'),dark=material('#424f35','bark'),leaf=material('#668453','cloth');
  const trunk=ellipsoid(body,0.3,0.47,0.23,bark,0,0.25,0);trunk.rotation.x=-0.22;
  const head=new THREE.Group();head.position.set(0,0.67,0.14);body.add(head);
  const skull=mesh(head,new THREE.CylinderGeometry(0.19,0.14,0.35,7),dark);skull.rotation.x=0.25;
  for(const x of [-0.065,0.065])ellipsoid(head,0.028,0.028,0.018,material('#e1cf78'),x,0.035,0.16);
  for(let i=0;i<7;i++){const stem=mesh(head,new THREE.ConeGeometry(0.055,0.42,5),bark,Math.sin(i*2)*0.2,0.29,Math.cos(i*2)*0.12);stem.rotation.z=Math.sin(i*2)*0.8;const l=mesh(head,new THREE.ConeGeometry(0.16,0.34,4),leaf,Math.sin(i*2)*0.24,0.48,Math.cos(i*2)*0.16);l.scale.z=0.25;l.rotation.z=Math.sin(i*2);}
  const leftArm=limb(body,-0.3,0.48,0,0.58,0.08,bark),rightArm=limb(body,0.3,0.48,0,0.58,0.08,bark);
  for(const arm of [leftArm,rightArm]){for(let i=0;i<3;i++){const finger=mesh(arm,new THREE.ConeGeometry(0.035,0.22,5),dark,(i-1)*0.06,-0.59,0.08);finger.rotation.x=Math.PI;}arm.rotation.z=arm===leftArm?0.2:-0.2;}
  const leftLeg=limb(body,-0.16,0,0,0.62,0.09,dark),rightLeg=limb(body,0.16,0,0,0.62,0.09,dark);
  for(const leg of [leftLeg,rightLeg])for(let i=0;i<3;i++){const rootlet=mesh(leg,new THREE.ConeGeometry(0.06,0.28,5),bark,(i-1)*0.08,-0.69,0.1);rootlet.rotation.x=1.2;}
  return{root,body,leftArm,rightArm,leftLeg,rightLeg,head,kind:'sproutling',restY:0.82};
}
export function wolf():Actor{
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.position.y=0.9;
  const fur=material('#6c7166','leather'),dark=material('#414b43','bark'),pale=material('#a9a793','leather');
  ellipsoid(body,0.28,0.32,0.76,fur,0,0.1,0);ellipsoid(body,0.33,0.38,0.35,dark,0,0.17,0.44);ellipsoid(body,0.22,0.24,0.27,pale,0,0.42,0.6);
  const head=new THREE.Group();head.position.set(0,0.38,0.75);body.add(head);
  ellipsoid(head,0.21,0.23,0.3,fur,0,0,0);ellipsoid(head,0.13,0.11,0.27,pale,0,-0.08,0.3);ellipsoid(head,0.08,0.065,0.055,dark,0,-0.05,0.54);
  for(const x of [-0.13,0.13]){const ear=mesh(head,new THREE.ConeGeometry(0.115,0.31,4),dark,x,0.28,-0.035);ear.scale.z=0.6;ear.rotation.z=-x*0.9;ellipsoid(head,0.027,0.027,0.03,material('#c9a758'),x*1.2,0.06,0.16);mesh(head,new THREE.ConeGeometry(0.028,0.1,5),material('#d3c8a7'),x,-0.17,0.28).rotation.x=Math.PI;}
  const leftArm=limb(body,-0.22,0.05,0.47,0.43,0.09,fur),rightArm=limb(body,0.22,0.05,0.47,0.43,0.09,fur),leftLeg=limb(body,-0.22,0.04,-0.52,0.42,0.13,fur),rightLeg=limb(body,0.22,0.04,-0.52,0.42,0.13,fur);
  for(const l of [leftArm,rightArm,leftLeg,rightLeg]){const low=mesh(l,new THREE.CylinderGeometry(0.065,0.05,0.35,8),dark,0,-0.6,0.09);low.rotation.x=-0.16;ellipsoid(l,0.09,0.065,0.14,dark,0,-0.8,0.15);}
  const tail=mesh(body,new THREE.ConeGeometry(0.14,0.8,8),dark,0,0.04,-0.99);tail.rotation.x=-1.0;
  for(let i=0;i<5;i++){const ridge=mesh(body,new THREE.ConeGeometry(0.08,0.23,4),dark,0,0.44,0.35-i*0.14);ridge.rotation.x=-0.4;}
  return{root,body,leftArm,rightArm,leftLeg,rightLeg,head,kind:'forestwolf',restY:0.9};
}
export function animate(a:Actor,motion:string,time:number,animationAt:number,facing:number){
  const t=time-animationAt,walk=motion==='walk',attack=motion==='attack',dead=motion==='death',hit=motion==='hit';
  a.root.rotation.y=facing;a.body.position.y=a.restY+(walk?Math.sin(time*15)*0.035:Math.sin(time*2)*0.008);a.body.rotation.set(0,0,0);
  const stride=walk?Math.sin(time*(a.kind==='forestwolf'?14:11))*0.55:0;
  a.leftLeg.rotation.x=stride;a.rightLeg.rotation.x=-stride;a.leftArm.rotation.x=-stride*0.6;a.rightArm.rotation.x=stride*0.6;
  a.leftArm.rotation.z=0.1;a.rightArm.rotation.z=-0.1;
  if(a.kind==='forestwolf'){a.leftArm.rotation.x=-stride;a.rightArm.rotation.x=stride;}
  if(attack){const swing=Math.max(0,Math.sin(Math.min(1,t/0.6)*Math.PI));a.rightArm.rotation.x=-swing*2.5;a.rightArm.rotation.z=-0.2-swing*0.4;a.body.rotation.y=-swing*0.5;a.body.rotation.x=a.kind==='forestwolf'?-swing*0.3:0;}
  if(hit){a.body.rotation.x=-Math.sin(Math.min(1,t/0.25)*Math.PI)*0.28;}
  if(dead){const phase=Math.min(1,t/0.6);a.body.rotation.z=-phase*1.45;a.body.position.y=a.restY*(1-phase)+0.24*phase;}
}
export function crystal(parent:THREE.Object3D,height=1,color='#74d7d0'){
  const mat=new THREE.MeshPhongMaterial({color,emissive:color,emissiveIntensity:0.18,specular:'#b1ecd8',shininess:70});
  const shape=new THREE.OctahedronGeometry(height*0.32,0);const m=mesh(parent,shape,mat,0,height*0.58,0);m.scale.set(0.7,1.8,0.7);return m;
}
export function building(style:string,w:number,d:number,h:number):THREE.Group{
  const g=new THREE.Group(),stone=material('#92907d','stone'),timber=material('#785c42','wood'),roofMat=material('#7c6a54','roof'),iron=material('#41483f','steel',0.5);
  if(style==='crystal'){
    mesh(g,new THREE.CylinderGeometry(w/2,w/2+0.2,0.22,12),stone,0,0.11,0);mesh(g,new THREE.CylinderGeometry(w/3,w/2,0.5,8),stone,0,0.46,0);
    crystal(g,h*0.78);for(let i=0;i<4;i++){const a=i*Math.PI/2,shard=new THREE.Group();shard.position.set(Math.sin(a)*0.78,0.35,Math.cos(a)*0.78);shard.rotation.z=Math.cos(a)*-0.28;g.add(shard);crystal(shard,0.9);}
    const light=new THREE.PointLight('#73e5d8',4,7,2);light.position.y=2;g.add(light);return g;
  }
  if(style==='wall'){
    box(g,w,h,d,stone,0,h/2,0);for(let x=-w/2+0.4;x<w/2;x+=1.1)box(g,0.65,0.36,d+0.1,stone,x,h+0.18,0);
    for(const x of [-w/2,w/2]){box(g,1.1,h+0.9,1.25,stone,x,(h+0.9)/2,0);mesh(g,new THREE.ConeGeometry(0.85,0.9,4),roofMat,x,h+1.3,0).rotation.y=Math.PI/4;}
    return g;
  }
  const wallH=h*0.62;
  box(g,w,0.28,d,stone,0,0.14,0);box(g,w-0.15,wallH,d-0.15,stone,0,wallH/2,0);
  for(const x of [-w/2+0.05,w/2-0.05])for(const z of [-d/2+0.05,d/2-0.05])box(g,0.15,wallH+0.1,0.15,timber,x,wallH/2,z);
  for(const y of [0.38,wallH*0.65,wallH]){box(g,w+0.08,0.13,0.13,timber,0,y,d/2);box(g,w+0.08,0.13,0.13,timber,0,y,-d/2);box(g,0.13,0.13,d,timber,w/2,y,0);box(g,0.13,0.13,d,timber,-w/2,y,0);}
  for(const x of [-w/2+1,w/2-1]){
    box(g,0.75,0.95,0.07,timber,x,wallH*0.6,d/2+0.02);box(g,0.58,0.74,0.07,material('#383c31'),x,wallH*0.6,d/2+0.075);
    box(g,0.06,0.72,0.06,timber,x,wallH*0.6,d/2+0.12);box(g,0.62,0.065,0.06,timber,x,wallH*0.6,d/2+0.12);
  }
  box(g,0.85,1.65,0.13,timber,0,0.98,d/2+0.07);box(g,0.98,0.17,0.55,stone,0,0.14,d/2+0.26);ellipsoid(g,0.035,0.035,0.04,iron,0.28,0.85,d/2+0.15);
  // Gable roof, individual ridge and barge boards; original shingle texture.
  const roofY=wallH+0.05,rise=h-wallH,half=d/2+0.35;
  const verts=new Float32Array([-w/2-0.35,roofY,-half,w/2+0.35,roofY,-half,w/2+0.35,roofY+rise,0,-w/2-0.35,roofY+rise,0,-w/2-0.35,roofY,half,w/2+0.35,roofY,half]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,3,0,3,2,0,2,0,0,3,0],2));geo.setIndex([0,3,2,0,2,1,3,4,5,3,5,2]);geo.computeVertexNormals();mesh(g,geo,roofMat);
  for(const x of [-w/2-0.35,w/2+0.35])for(const sign of [-1,1]){const beam=box(g,0.14,0.15,Math.hypot(half,rise),timber,x,roofY+rise/2,sign*half/2);beam.rotation.x=sign*Math.atan2(rise,half);}
  box(g,w+0.85,0.13,0.13,timber,0,roofY+rise+0.025,0);
  for(const x of [-w/2,w/2]){const triangle=new THREE.BufferGeometry();triangle.setAttribute('position',new THREE.Float32BufferAttribute([x,roofY,-d/2,x,roofY+rise,0,x,roofY,d/2],3));triangle.computeVertexNormals();const mat=material('#7c7560','wood').clone();mat.side=THREE.DoubleSide;mesh(g,triangle,mat);}
  box(g,0.6,1.8,0.6,stone,-w/3,h-0.4,-0.5);
  if(style==='forge'){
    const forge=new THREE.Group();g.add(forge);forge.position.set(w/2+0.75,0,-1.75);
    box(forge,1.1,0.75,1.2,stone,0,0.375,0);box(forge,0.85,0.12,0.85,material('#df7736'),0,0.8,0);
    for(let i=0;i<7;i++)ellipsoid(forge,0.11,0.06,0.12,material('#43382a'),Math.cos(i)*0.25,0.88,Math.sin(i)*0.25);
    const fire=new THREE.PointLight('#ff982d',5,7);fire.position.y=1;forge.add(fire);
    box(forge,0.4,0.6,0.4,iron,0,0.3,1.3);box(forge,0.85,0.17,0.4,iron,0,0.68,1.3);mesh(forge,new THREE.ConeGeometry(0.22,0.5,4),iron,0.55,0.68,1.3).rotation.z=-Math.PI/2;
  }
  if(style==='market'){
    const canvas=material('#657269','cloth');for(const x of [-w/2,w/2])box(g,0.1,2.25,0.1,timber,x,1.12,d/2+1.55);
    const awning=box(g,w+0.2,0.06,1.7,canvas,0,2.25,d/2+0.8);awning.rotation.x=0.18;
    box(g,w-0.5,0.75,0.75,timber,0,0.38,d/2+0.75);for(let i=0;i<8;i++)ellipsoid(g,0.14,0.14,0.14,material(i%2?'#9c6d42':'#7d8955'),(i-3.5)*0.3,0.88,d/2+0.7);
  }
  return g;
}
export function optimizeActor(actor:Actor){
  const parents:THREE.Object3D[]=[];actor.root.traverse(p=>{if(p instanceof THREE.Group)parents.push(p);});
  for(const parent of parents){const children=parent.children.filter((m):m is THREE.Mesh=>m instanceof THREE.Mesh&&!Array.isArray(m.material));const groups=new Map<string,{mat:THREE.Material;geos:THREE.BufferGeometry[]}>();
    for(const m of children){m.updateMatrix();const mat=m.material as THREE.Material,key=`${mat.uuid}:${Object.keys(m.geometry.attributes).sort().join(',')}`;let group=groups.get(key);if(!group){group={mat,geos:[]};groups.set(key,group);}group.geos.push(m.geometry.clone().applyMatrix4(m.matrix));parent.remove(m);m.geometry.dispose();}
    for(const group of groups.values()){const geo=mergeGeometries(group.geos);if(geo){const m=new THREE.Mesh(geo,group.mat);m.receiveShadow=true;m.castShadow=false;parent.add(m);}for(const g of group.geos)g.dispose();}
  }
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'rgba(5,12,5,.44)');gradient.addColorStop(1,'rgba(5,12,5,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(actor.kind==='forestwolf'?1.3:1.2,actor.kind==='forestwolf'?2.5:1.2),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=0.015;actor.root.add(shadow);
  return actor;
}
export function tree(height:number):THREE.Group{
  const g=new THREE.Group(),bark=material('#71614d','bark');mesh(g,new THREE.CylinderGeometry(0.10,0.27,height*0.7,9),bark,0,height*0.35,0);
  for(let i=0;i<5;i++){const a=i*2.399,branch=mesh(g,new THREE.CylinderGeometry(0.04,0.095,height*0.4,7),bark,Math.cos(a)*0.25,height*(0.48+i*0.045),Math.sin(a)*0.25);branch.rotation.z=Math.cos(a)*-0.65;branch.rotation.x=Math.sin(a)*0.65;
    const geometry=new THREE.IcosahedronGeometry(height*0.25,2),positions=geometry.getAttribute('position');
    for(let v=0;v<positions.count;v++){const x=positions.getX(v),y=positions.getY(v),z=positions.getZ(v),f=0.8+0.2*Math.sin(x*34+y*23+z*54);positions.setXYZ(v,x*f,y*f,z*f);}geometry.computeVertexNormals();
    const canopy=mesh(g,geometry,material(['#3c5437','#4c6140','#5c6f46','#485b38','#576b47'][i],'bark'),Math.cos(a)*height*0.18,height*(0.72+i*0.025),Math.sin(a)*height*0.18);canopy.scale.set(1,0.85,0.9);
  }return g;
}
export function barrel(parent:THREE.Object3D,x:number,z:number){const m=mesh(parent,new THREE.CylinderGeometry(0.29,0.25,0.65,12),material('#876343','wood'),x,0.325,z);for(const y of [0.15,0.5]){const band=mesh(parent,new THREE.TorusGeometry(0.282,0.018,4,12),material('#4c5248','steel',0.5),x,y,z);band.rotation.x=Math.PI/2;}return m;}
export function dispose(root:THREE.Object3D){root.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.geometry.dispose();});}
