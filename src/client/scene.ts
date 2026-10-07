import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Content,Vec2 } from '../shared/content';
import { inside } from '../shared/geometry';
import type { GameEvent, Snapshot } from '../shared/protocol';
import { animate, barrel, box, building, crystal, dispose, groundImages, human, material, mesh, optimizeActor, sproutling, sword, tree, wolf, type Actor } from './art';
export type Pick={kind:'ground';point:Vec2}|{kind:'monster'|'npc'|'loot';id:string};
type Visual={actor:Actor;pos:THREE.Vector3;facing:number;motion:string;at:number};
type Floating={el:HTMLElement;point:THREE.Vector3;start:number};
export class GameScene {
  renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=new THREE.OrthographicCamera();world=new THREE.Group();dynamic=new THREE.Group();
  actors=new Map<string,Visual>();drops=new Map<string,THREE.Group>();labels=new Map<string,HTMLElement>();floats:Floating[]=[];effects:{mesh:THREE.Mesh;start:number;kind:string}[]=[];
  targetRing:THREE.Mesh;moveRing:THREE.Mesh;moveAt=-10;view:number;content:Content;state:Snapshot|null=null;
  occluders:{box:THREE.Box3;materials:THREE.Material[]}[]=[];
  focus=new THREE.Vector3();ray=new THREE.Raycaster();pointer=new THREE.Vector2();plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  lastFrame=performance.now();fps=60;drawCalls=0;triangles=0;frameCount=0;lastEvent=0;hover:string|null=null;
  softwareRenderer=false;
  constructor(readonly canvas:HTMLCanvasElement,readonly layer:HTMLElement,content:Content,readonly onPick:(p:Pick,right:boolean)=>void){
    this.content=content;this.view=content.world.camera.viewSize;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    const gl=this.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),gpu=debug?String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)):'';this.softwareRenderer=/swiftshader|llvmpipe|software|basic render|warp/i.test(gpu);
    this.renderer.setPixelRatio(this.softwareRenderer?0.75:Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.16;
    this.scene.background=new THREE.Color('#343c2d');this.scene.add(this.world,this.dynamic);
    this.targetRing=this.ring('#cb7155',0.65);this.moveRing=this.ring('#e0ce98',0.32);this.dynamic.add(this.targetRing,this.moveRing);this.targetRing.visible=this.moveRing.visible=false;
    this.buildWorld();this.focus.set(content.world.spawn.x,0,content.world.spawn.z);this.resize();
    window.addEventListener('resize',()=>this.resize());
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;const pick=this.pick(e.clientX,e.clientY);if(pick){if(pick.kind==='ground'){this.moveRing.position.set(pick.point.x,0.025,pick.point.z);this.moveAt=performance.now()/1000;}this.onPick(pick,e.button===2);}});
    canvas.addEventListener('pointermove',e=>{const pick=this.pick(e.clientX,e.clientY);this.hover=pick?.kind==='monster'?pick.id:null;canvas.style.cursor=pick?.kind==='monster'?'crosshair':pick?.kind==='npc'?'pointer':'default';});
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.view=THREE.MathUtils.clamp(this.view+Math.sign(e.deltaY)*0.9,this.content.world.camera.minView,this.content.world.camera.maxView);this.resize();},{passive:false});
  }
  ring(color:string,radius:number){const m=new THREE.Mesh(new THREE.RingGeometry(radius*0.9,radius,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.85,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=0.03;return m;}
  resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);const aspect=w/h;this.camera.left=-this.view*aspect/2;this.camera.right=this.view*aspect/2;this.camera.top=this.view/2;this.camera.bottom=-this.view/2;this.camera.near=0.1;this.camera.far=160;this.camera.updateProjectionMatrix();}
  setContent(content:Content){this.content=content;this.view=THREE.MathUtils.clamp(this.view,content.world.camera.minView,content.world.camera.maxView);this.buildWorld();for(const {actor} of this.actors.values()){dispose(actor.root);this.dynamic.remove(actor.root);}this.actors.clear();for(const drop of this.drops.values()){dispose(drop);this.dynamic.remove(drop);}this.drops.clear();for(const el of this.labels.values())el.remove();this.labels.clear();this.resize();}
  groundTexture(){
    const c=document.createElement('canvas');c.width=c.height=2048;const ctx=c.getContext('2d')!,b=this.content.world.bounds,w=b.maxX-b.minX,h=b.maxZ-b.minZ;
    let seed=119;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const px=(x:number)=>(x-b.minX)/w*2048,pz=(z:number)=>(z-b.minZ)/h*2048;
    ctx.fillStyle='#596448';ctx.fillRect(0,0,2048,2048);
    for(let i=0;i<38000;i++){const x=random()*2048,y=random()*2048;ctx.fillStyle=['#60704a','#3b4e38','#85856b','#6d7850','#4e6040'][i%5];ctx.globalAlpha=0.1+random()*0.3;ctx.fillRect(x,y,random()*5+1,random()*4+1);}
    ctx.globalAlpha=1;
    if(groundImages.meadow)for(let y=0;y<2048;y+=190)for(let x=0;x<2048;x+=190)ctx.drawImage(groundImages.meadow,x,y,190,190);
    // Soil trail joins the gate and the two farming clearings; it is not a road grid.
    ctx.strokeStyle='#78736088';ctx.lineWidth=110;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(px(0),pz(11));ctx.bezierCurveTo(px(0),pz(-1),px(-7),pz(-5),px(4),pz(-13));ctx.lineTo(px(9),pz(-23));ctx.stroke();
    for(const s of this.content.spots){ctx.fillStyle='#8d826733';ctx.beginPath();ctx.ellipse(px(s.x),pz(s.z),s.radius/w*2048*1.1,s.radius/h*2048*1.1,0,0,Math.PI*2);ctx.fill();}
    const safe=this.content.world.safeZone;
    ctx.fillStyle='#797b69';ctx.fillRect(px(safe.minX),pz(safe.minZ),(safe.maxX-safe.minX)/w*2048,(safe.maxZ-safe.minZ)/h*2048);
    const cell=23;
    for(let y=pz(safe.minZ);y<pz(safe.maxZ);y+=cell)for(let x=px(safe.minX)-cell;x<px(safe.maxX);x+=cell){const ox=(Math.round(y/cell)%2)*cell/2;ctx.fillStyle=`hsl(${42+random()*15},${6+random()*6}%,${38+random()*13}%)`;ctx.beginPath();ctx.roundRect(x+ox+1,y+1,cell-3-random()*2,cell-3-random()*2,3);ctx.fill();ctx.strokeStyle='rgba(186,178,143,.22)';ctx.lineWidth=1;ctx.stroke();}
    for(let i=0;i<20000;i++){const x=random()*2048,y=random()*2048;ctx.fillStyle=i%3?'rgba(26,35,24,.12)':'rgba(172,164,130,.12)';ctx.fillRect(x,y,random()*3+1,random()*3+1);}
    if(groundImages.cobble){ctx.save();ctx.beginPath();ctx.rect(px(safe.minX),pz(safe.minZ),(safe.maxX-safe.minX)/w*2048,(safe.maxZ-safe.minZ)/h*2048);ctx.clip();for(let y=pz(safe.minZ);y<pz(safe.maxZ);y+=145)for(let x=px(safe.minX);x<px(safe.maxX);x+=145)ctx.drawImage(groundImages.cobble,x,y,145,145);ctx.restore();}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;return tex;
  }
  buildWorld(){
    this.occluders=[];
    for(const obj of [...this.world.children]){dispose(obj);this.world.remove(obj);}for(const obj of this.scene.children.filter(o=>o instanceof THREE.Light))this.scene.remove(obj);
    const day=this.content.balance.daylight;
    this.scene.add(new THREE.HemisphereLight('#e1e6d4','#737663',2.1*day));
    const sun=new THREE.DirectionalLight('#ffddb0',2.5*day);sun.position.set(-15,32,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=40;sun.shadow.camera.bottom=-40;sun.shadow.camera.far=100;sun.shadow.normalBias=0.035;sun.shadow.bias=-0.0003;this.scene.add(sun);
    if(this.softwareRenderer)sun.shadow.mapSize.set(512,512);
    sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
    const b=this.content.world.bounds,w=b.maxX-b.minX,d=b.maxZ-b.minZ;
    const ground=mesh(this.world,new THREE.PlaneGeometry(w,d),new THREE.MeshLambertMaterial({map:this.groundTexture()}), (b.minX+b.maxX)/2,-0.015,(b.minZ+b.maxZ)/2);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
    for(const l of this.content.world.landmarks){const g=building(l.style,l.width,l.depth,l.height);g.position.set(l.x,0,l.z);g.rotation.y=l.facing;
      if(l.style!=='crystal'){const clones=new Map<string,THREE.Material>();g.traverse(obj=>{if(!(obj instanceof THREE.Mesh)||Array.isArray(obj.material))return;const original=obj.material as THREE.Material,mat:THREE.Material=clones.get(original.uuid)??original.clone();mat.transparent=true;clones.set(original.uuid,mat);obj.material=mat;});this.occluders.push({box:new THREE.Box3(new THREE.Vector3(l.x-l.width/2-0.3,0,l.z-l.depth/2-0.3),new THREE.Vector3(l.x+l.width/2+0.3,l.height,l.z+l.depth/2+0.3)),materials:[...clones.values()]});}
      this.world.add(g);}
    const wood=material('#725e45','wood'),stone=material('#777c66','stone');
    // Tall timber palisade closes the town perimeter; only the southern gate is open.
    const safe=this.content.world.safeZone;
    for(const x of [safe.minX,safe.maxX])for(let z=safe.minZ+0.5;z<=safe.maxZ;z+=0.8){mesh(this.world,new THREE.CylinderGeometry(0.09,0.13,2.2,6),wood,x,1.1,z);mesh(this.world,new THREE.ConeGeometry(0.1,0.25,6),wood,x,2.32,z);}
    for(let x=safe.minX;x<=safe.maxX;x+=0.8)mesh(this.world,new THREE.CylinderGeometry(0.09,0.12,2.2,6),wood,x,1.1,safe.maxZ);
    for(const n of this.content.npcs.filter(n=>n.enabled)){const a=optimizeActor(human(n.style));a.root.position.set(n.x,0,n.z);a.root.rotation.y=n.facing;a.root.userData.npc=n.id;this.world.add(a.root);const ring=this.ring('#bbaa70',0.45);ring.position.set(n.x,0.025,n.z);this.world.add(ring);}
    for(const [x,z] of [[-11,12],[-10,12],[-11,21],[9,25],[10,25],[4,25]])barrel(this.world,x,z);
    for(const [x,z] of [[-11,20],[10,15],[-9,12]]){box(this.world,0.8,0.8,0.8,wood,x,0.4,z);for(const y of [0.1,0.7])box(this.world,0.86,0.09,0.86,wood,x,y,z);}
    for(const [x,z] of [[-3,7],[3,7],[-4,22],[3,15],[11,21],[-11,26]]){
      mesh(this.world,new THREE.CylinderGeometry(0.055,0.08,2.8,8),material('#424c43','steel',0.6),x,1.4,z);box(this.world,0.26,0.37,0.26,material('#e5b96c'),x,2.75,z);mesh(this.world,new THREE.ConeGeometry(0.27,0.23,4),wood,x,3.03,z).rotation.y=Math.PI/4;
    }
    let seed=7921;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<95;i++){
      const x=b.minX+2+random()*(w-4),z=b.minZ+2+random()*(d-4);
      if(inside({x,z},this.content.world.safeZone)||Math.abs(x)<5&&z>0||this.content.spots.some(s=>Math.hypot(x-s.x,z-s.z)<s.radius+3))continue;
      const t=tree(3.4+random()*2.2);t.position.set(x,0,z);t.rotation.y=random()*6;this.world.add(t);
    }
    for(let i=0;i<160;i++){const x=b.minX+random()*w,z=b.minZ+random()*d;if(inside({x,z},this.content.world.safeZone)||this.content.spots.some(s=>Math.hypot(x-s.x,z-s.z)<s.radius))continue;const r=mesh(this.world,new THREE.DodecahedronGeometry(0.2+random()*0.35),stone,x,0.1,z);r.scale.set(1,0.6,0.8);r.rotation.set(random(),random()*6,random());}
    const grassGeo=new THREE.ConeGeometry(0.08,0.28,3),grassMat=material('#6b7d4c');const count=6500,grass=new THREE.InstancedMesh(grassGeo,grassMat,count),dummy=new THREE.Object3D();let used=0;
    for(let i=0;i<count;i++){const x=b.minX+random()*w,z=b.minZ+random()*d;if(inside({x,z},this.content.world.safeZone)||Math.abs(x)<2&&z>-1)continue;dummy.position.set(x,0.12,z);dummy.rotation.y=random()*6;dummy.scale.setScalar(0.6+random()*0.8);dummy.updateMatrix();grass.setMatrixAt(used++,dummy.matrix);}grass.count=used;grass.receiveShadow=true;this.world.add(grass);
    for(const spot of this.content.spots){const stones=8;for(let i=0;i<stones;i++){const a=i*Math.PI*2/stones;const r=mesh(this.world,new THREE.DodecahedronGeometry(0.25),stone,spot.x+Math.cos(a)*(spot.radius+0.8),0.07,spot.z+Math.sin(a)*(spot.radius+0.8));r.scale.y=0.5;}}
    this.batchStatics();
  }
  batchStatics(){
    this.world.updateMatrixWorld(true);
    const groups=new Map<string,{material:THREE.Material;cast:boolean;receive:boolean;geometries:THREE.BufferGeometry[]}>(),meshes:THREE.Mesh[]=[];
    this.world.traverse(obj=>{if(!(obj instanceof THREE.Mesh)||obj instanceof THREE.InstancedMesh||Array.isArray(obj.material))return;meshes.push(obj);const key=`${obj.material.uuid}:${obj.castShadow}:${obj.receiveShadow}:${Object.keys(obj.geometry.attributes).sort().join(',')}`;let group=groups.get(key);if(!group){group={material:obj.material,cast:obj.castShadow,receive:obj.receiveShadow,geometries:[]};groups.set(key,group);}group.geometries.push(obj.geometry.clone().applyMatrix4(obj.matrixWorld));});
    for(const obj of meshes){obj.parent?.remove(obj);obj.geometry.dispose();}
    for(const group of groups.values()){const geometry=mergeGeometries(group.geometries);if(geometry){const m=new THREE.Mesh(geometry,group.material);m.castShadow=group.cast;m.receiveShadow=group.receive;this.world.add(m);}for(const geo of group.geometries)geo.dispose();}
  }
  update(state:Snapshot){this.state=state;
    const all=[{...state.me,def:'vanguard'},...state.players.map(p=>({...p,def:'vanguard'})),...state.monsters];const active=new Set<string>();
    for(const entity of all){active.add(entity.id);let v=this.actors.get(entity.id);if(!v){const style=entity.def==='vanguard'?'vanguard':this.content.monsters.find(m=>m.id===entity.def)?.style;const actor=optimizeActor(style==='forestwolf'?wolf():style==='sproutling'?sproutling():human());actor.root.position.set(entity.x,0,entity.z);actor.root.userData.entity=entity.id;this.dynamic.add(actor.root);v={actor,pos:new THREE.Vector3(entity.x,0,entity.z),facing:entity.facing,motion:entity.motion,at:entity.animationAt};this.actors.set(entity.id,v);}v.pos.set(entity.x,0,entity.z);v.facing=entity.facing;v.motion=entity.motion;v.at=entity.animationAt;v.actor.root.visible=entity.hp>0||state.time-entity.animationAt<1.8;
      if(entity.def==='vanguard'&&'equipment' in entity){const weapon=v.actor.weapon;if(weapon)weapon.visible=!!entity.equipment.weapon;}
    }
    for(const [id,v] of this.actors)if(!active.has(id)){dispose(v.actor.root);this.dynamic.remove(v.actor.root);this.actors.delete(id);}
    const drops=new Set<string>();for(const l of state.loot){drops.add(l.id);if(!this.drops.has(l.id)){const def=this.content.items.find(i=>i.id===l.item)!,g=new THREE.Group();g.position.set(l.x,0.03,l.z);this.dynamic.add(g);this.drops.set(l.id,g);
      if(def.model==='crystal'){crystal(g,0.45);const light=new THREE.PointLight('#79ded0',0.6,1.8);light.position.y=0.3;g.add(light);const particles=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([0.1,0.4,0,-0.1,0.25,0.1,0,0.5,-0.1],3)),new THREE.PointsMaterial({color:'#b5efdc',size:1.7,sizeAttenuation:false,transparent:true,opacity:0.65,depthWrite:false}));g.add(particles);g.userData.particles=particles;}
      else if(def.model==='sword'){const s=sword(g);s.rotation.set(Math.PI/2,0,0.4);s.position.y=0.055;}
      else if(def.type==='currency'){for(let i=0;i<5;i++)mesh(g,new THREE.CylinderGeometry(0.07,0.07,0.025,10),material('#b99b4d','steel',0.7),Math.sin(i)*0.11,0.02+i*0.012,Math.cos(i)*0.08);}
      else{mesh(g,new THREE.CylinderGeometry(0.07,0.09,0.21,10),material(def.id==='health'?'#ae5642':'#527e9b'),0,0.11,0);mesh(g,new THREE.CylinderGeometry(0.045,0.045,0.05,8),material('#a29064'),0,0.24,0);}
    }}
    for(const [id,g] of this.drops)if(!drops.has(id)){dispose(g);this.dynamic.remove(g);this.drops.delete(id);}
    for(const e of state.events)if(e.id>this.lastEvent){this.lastEvent=e.id;this.event(e);}
  }
  project(point:THREE.Vector3){const p=point.clone().project(this.camera);return{x:(p.x+1)*this.canvas.clientWidth/2,y:(1-p.y)*this.canvas.clientHeight/2,visible:p.z>-1&&p.z<1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2};}
  pick(x:number,y:number):Pick|null{
    if(!this.state)return null;const rect=this.canvas.getBoundingClientRect();x-=rect.left;y-=rect.top;
    const candidates:{pick:Pick;score:number}[]=[];
    for(const m of this.state.monsters.filter(m=>m.hp>0)){const v=this.actors.get(m.id),p=this.project(new THREE.Vector3(v?.actor.root.position.x??m.x,0.95,v?.actor.root.position.z??m.z));const dx=(x-p.x)/26,dy=(y-p.y)/34;if(p.visible&&dx*dx+dy*dy<1.4)candidates.push({pick:{kind:'monster',id:m.id},score:dx*dx+dy*dy});}
    for(const n of this.content.npcs.filter(n=>n.enabled)){const p=this.project(new THREE.Vector3(n.x,1.1,n.z)),dx=(x-p.x)/24,dy=(y-p.y)/32;if(p.visible&&dx*dx+dy*dy<1.3)candidates.push({pick:{kind:'npc',id:n.id},score:dx*dx+dy*dy});}
    if(candidates.length)return candidates.sort((a,b)=>a.score-b.score)[0].pick;
    this.pointer.set(x/rect.width*2-1,1-y/rect.height*2);this.ray.setFromCamera(this.pointer,this.camera);const point=new THREE.Vector3();if(this.ray.ray.intersectPlane(this.plane,point)&&inside({x:point.x,z:point.z},this.content.world.bounds))return{kind:'ground',point:{x:point.x,z:point.z}};return null;
  }
  event(e:GameEvent){
    if(e.type==='damage'||e.type==='level'){
      const el=document.createElement('div');el.className=`floating ${e.who===this.state?.me.id?'self':''} ${e.type}`;el.textContent=e.type==='damage'?`${e.value}`:e.text??'';this.layer.append(el);this.floats.push({el,point:new THREE.Vector3(e.x,2.3,e.z),start:performance.now()/1000});
    }
    if(e.type==='skill'){const skill=this.content.skills.find(s=>s.id===e.skill);if(!skill)return;const geo=skill.kind==='aoe'?new THREE.RingGeometry(0.7,0.8,64):new THREE.RingGeometry(0.8,1.2,32,1,0,Math.PI*0.85);const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:skill.color,transparent:true,opacity:0.65,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(e.x,0.24,e.z);const actor=this.actors.get(e.who??'');m.rotation.z=-(actor?.facing??0)-Math.PI*0.3;this.dynamic.add(m);this.effects.push({mesh:m,start:performance.now()/1000,kind:skill.kind});}
  }
  label(key:string,text:string,x:number,y:number,style:string,click?:()=>void){
    let el=this.labels.get(key);if(!el){el=document.createElement(click?'button':'div');el.className=`world-label ${style}`;if(click)el.onclick=click;this.layer.append(el);this.labels.set(key,el);}if(el.textContent!==text)el.textContent=text;el.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;el.style.display='';return el;
  }
  frame(now:number){
    const actualDt=(now-this.lastFrame)/1000,dt=Math.min(0.1,actualDt);this.lastFrame=now;this.fps+=(1/Math.max(actualDt,0.001)-this.fps)*0.1;this.frameCount++;
    const time=(this.state?.time??0)+(now-(this.state?this.stateArrival:now))/1000;
    for(const v of this.actors.values()){v.actor.root.position.lerp(v.pos,Math.min(1,dt*22));animate(v.actor,v.motion,time,v.at,v.facing);}
    for(const drop of this.drops.values()){const points=drop.userData.particles as THREE.Points|undefined;if(points){const positions=points.geometry.getAttribute('position');for(let i=0;i<3;i++)positions.setXYZ(i,Math.sin(time*0.8+i*2)*0.18,0.25+((time*0.12+i/3)%0.32),Math.cos(time*0.9+i*2)*0.15);positions.needsUpdate=true;}}
    if(this.state){const player=this.actors.get(this.state.me.id);if(player)this.focus.lerp(player.actor.root.position,1-Math.exp(-dt*15));}
    const c=this.content.world.camera;this.camera.position.set(this.focus.x+c.offsetX,c.height,this.focus.z+c.offsetZ);this.camera.lookAt(this.focus.x,0.5,this.focus.z);
    const sight=new THREE.Ray(this.camera.position.clone(),this.focus.clone().add(new THREE.Vector3(0,1,0)).sub(this.camera.position).normalize()),intersection=new THREE.Vector3();
    for(const occluder of this.occluders){const hit=sight.intersectBox(occluder.box,intersection),occluded=!!hit&&intersection.distanceTo(this.camera.position)<this.focus.distanceTo(this.camera.position)-1;for(const mat of occluder.materials){const opacity=occluded?0.25:1;mat.opacity+=(opacity-mat.opacity)*Math.min(1,dt*12);mat.depthWrite=mat.opacity>0.97;}}
    const target=this.state?.me.target?this.actors.get(this.state.me.target):undefined;this.targetRing.visible=!!target&&target.actor.root.visible;if(target)this.targetRing.position.set(target.actor.root.position.x,0.025,target.actor.root.position.z);
    const elapsed=now/1000-this.moveAt;this.moveRing.visible=elapsed<0.6;this.moveRing.scale.setScalar(1+elapsed*0.6);(this.moveRing.material as THREE.MeshBasicMaterial).opacity=Math.max(0,1-elapsed/0.6);
    const aliveLabels=new Set<string>();
    if(this.state){
      const me=this.state.me,p=this.project(new THREE.Vector3(playerX(this.actors,me.id,me.x),2.22,playerZ(this.actors,me.id,me.z)));if(p.visible){aliveLabels.add('player');this.label('player',me.name,p.x,p.y,'player');}
      for(const n of this.content.npcs.filter(n=>n.enabled)){const p=this.project(new THREE.Vector3(n.x,2.15,n.z));if(!p.visible)continue;const key=`npc:${n.id}`;aliveLabels.add(key);this.label(key,`${n.name} · ${n.role}`,p.x,p.y,'npc',()=>this.onPick({kind:'npc',id:n.id},false));}
      for(const m of this.state.monsters.filter(m=>m.hp>0)){if(me.target!==m.id&&this.hover!==m.id&&Math.hypot(me.x-m.x,me.z-m.z)>8)continue;const v=this.actors.get(m.id),p=this.project(new THREE.Vector3(v?.actor.root.position.x??m.x,m.def==='forestwolf'?1.8:2,v?.actor.root.position.z??m.z));if(!p.visible)continue;const key=`monster:${m.id}`;aliveLabels.add(key);const def=this.content.monsters.find(d=>d.id===m.def)!;const el=this.label(key,`${def.name} · ${def.level}`,p.x,p.y,'monster');el.style.setProperty('--health',`${m.hp/m.maxHP*100}%`);}
      const occupied:{x:number;y:number}[]=[];
      for(const l of [...this.state.loot].sort((a,b)=>a.id.localeCompare(b.id))){const p=this.project(new THREE.Vector3(l.x,0.45,l.z));if(!p.visible)continue;while(occupied.some(o=>Math.abs(o.x-p.x)<120&&Math.abs(o.y-p.y)<20))p.y-=21;occupied.push(p);const def=this.content.items.find(i=>i.id===l.item)!;const key=`loot:${l.id}`;aliveLabels.add(key);const locked=l.owner!==me.id&&this.state.time<l.publicAt;this.label(key,`${def.name}${l.amount>1?` ×${l.amount}`:''}${locked?' · reservado':''}`,p.x,p.y,`loot ${def.id==='eter'?'rare':def.type==='currency'?'currency':''}`,()=>this.onPick({kind:'loot',id:l.id},false));}
    }
    for(const [key,el] of this.labels)if(!aliveLabels.has(key))el.style.display='none';
    for(const f of [...this.floats]){const age=now/1000-f.start;if(age>1.4){f.el.remove();this.floats.splice(this.floats.indexOf(f),1);continue;}const p=this.project(f.point);f.el.style.transform=`translate(${p.x}px,${p.y-age*30}px) translate(-50%,-50%)`;f.el.style.opacity=String(1-age/1.4);}
    for(const e of [...this.effects]){const age=now/1000-e.start;if(age>0.45){this.dynamic.remove(e.mesh);e.mesh.geometry.dispose();(e.mesh.material as THREE.Material).dispose();this.effects.splice(this.effects.indexOf(e),1);}else{e.mesh.scale.setScalar(1+age*(e.kind==='aoe'?5:1.3));(e.mesh.material as THREE.MeshBasicMaterial).opacity=0.65*(1-age/0.45);}}
    this.renderer.render(this.scene,this.camera);this.drawCalls=this.renderer.info.render.calls;this.triangles=this.renderer.info.render.triangles;
  }
  stateArrival=performance.now();
  receive(state:Snapshot){this.stateArrival=performance.now();this.update(state);}
}
function playerX(actors:Map<string,Visual>,id:string,fallback:number){return actors.get(id)?.actor.root.position.x??fallback;}
function playerZ(actors:Map<string,Visual>,id:string,fallback:number){return actors.get(id)?.actor.root.position.z??fallback;}
