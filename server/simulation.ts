import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { equipmentSlots, inside, type Content, type Vec2 } from '../src/shared/content';
import { addItem, emptyCell, equipItem, fits } from '../src/shared/inventory';
import { distance, Navigation } from '../src/shared/navigation';
import type { Action, GameEvent, LootState, MonsterState, PlayerState, Snapshot } from '../src/shared/protocol';

const text=z.string().min(1).max(100),finite=z.number().finite();
const actionSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('move'),x:finite,z:finite}).strict(),
  z.object({type:z.literal('target'),id:text,skill:text}).strict(),
  z.object({type:z.literal('skill'),id:text}).strict(),z.object({type:z.literal('stop')}).strict(),
  z.object({type:z.literal('pickup'),id:text}).strict(),z.object({type:z.literal('npc'),id:text}).strict(),
  z.object({type:z.literal('buy'),npc:text,item:text}).strict(),z.object({type:z.literal('repair'),npc:text}).strict(),
  z.object({type:z.literal('equip'),uid:text}).strict(),z.object({type:z.literal('unequip'),slot:z.enum(equipmentSlots)}).strict(),
  z.object({type:z.literal('bag'),uid:text,x:finite.int(),y:finite.int()}).strict(),
  z.object({type:z.literal('use'),item:text}).strict(),z.object({type:z.literal('stat'),stat:z.enum(['strength','agility','vitality','energy'])}).strict()
]);
type Player=PlayerState&{path:Vec2[];pickup:string|null;gotoNPC:string|null;cooldown:number;pending:null|{target:string;skill:string;hitAt:number};repath:number;potionAt:number};
type Monster=MonsterState&{home:Vec2;path:Vec2[];victim:string|null;cooldown:number;hitAt:number;repath:number};
export class Simulation {
  time=0;revision=1;nav:Navigation;players=new Map<string,Player>();monsters=new Map<string,Monster>();loot=new Map<string,LootState>();events:GameEvent[]=[];eventId=0;
  constructor(public content:Content,readonly random:()=>number=Math.random){this.nav=new Navigation(content);this.spawnSpots();}
  spawnSpots(){
    this.monsters.clear();
    for(const spot of this.content.spots.filter(s=>s.enabled))for(let i=0;i<spot.quantity;i++){
      const angle=i*Math.PI*2/spot.quantity+0.3,r=spot.radius*(i%2?0.75:0.5);
      const home=this.nav.nearest({x:spot.x+Math.cos(angle)*r,z:spot.z+Math.sin(angle)*r});if(!home||inside(home,this.content.world.safeZone))continue;
      const def=this.content.monsters.find(m=>m.id===spot.monster)!;
      const id=`${spot.id}:${i}`;this.monsters.set(id,{id,def:def.id,spot:spot.id,...home,home,path:[],hp:def.hp,maxHP:def.hp,facing:angle,motion:'idle',animationAt:0,respawnAt:0,victim:null,cooldown:0,hitAt:0,repath:0});
    }
  }
  replaceContent(content:Content){this.content=content;this.nav=new Navigation(content);this.revision++;this.loot.clear();this.spawnSpots();for(const p of this.players.values()){p.path=[];p.target=null;p.pending=null;p.npc=null;p.gotoNPC=null;p.pickup=null;if(!this.nav.walkable(p))Object.assign(p,content.world.spawn);this.derive(p);p.hp=Math.min(p.hp,p.derived.maxHP);p.mana=Math.min(p.mana,p.derived.maxMana);}}
  createPlayer(id:string,name:string,saved?:PlayerState):Player{
    const cls=this.content.classes.find(c=>c.id==='vanguard')!,spawn=this.content.world.spawn;
    const p:Player={id,name,classId:cls.id,...spawn,level:1,xp:0,points:0,stats:{...cls.startingStats},hp:cls.startingHP,mana:cls.startingMana,crowns:100,eter:0,inventory:[],equipment:{},target:null,skill:this.content.skills[0].id,facing:Math.PI,motion:'idle',animationAt:0,deadUntil:0,npc:null,derived:{damage:0,defense:0,maxHP:cls.startingHP,maxMana:cls.startingMana,moveSpeed:cls.moveSpeed,attackSpeed:cls.attackSpeed},path:[],pickup:null,gotoNPC:null,cooldown:0,pending:null,repath:0,potionAt:0};
    p.points=cls.startingPoints;
    if(saved){for(const key of ['level','xp','points','stats','hp','mana','crowns','eter','inventory','equipment','x','z'] as const)(p as unknown as Record<string,unknown>)[key]=structuredClone(saved[key]);}
    else{
      for(const [slot,item] of Object.entries({weapon:cls.startingWeapon,chest:'chest',boots:'boots'})){const def=this.content.items.find(i=>i.id===item)!;p.equipment[slot as 'weapon'|'chest'|'boots']={uid:randomUUID(),item,x:0,y:0,durability:def.durability};}
      for(let i=0;i<4;i++)addItem(this.content,p,'health',randomUUID());for(let i=0;i<3;i++)addItem(this.content,p,'mana',randomUUID());
    }
    if(!this.nav.walkable(p))Object.assign(p,spawn);
    this.derive(p);p.hp=Math.max(1,Math.min(p.hp,p.derived.maxHP));p.mana=Math.min(p.mana,p.derived.maxMana);this.players.set(id,p);return p;
  }
  derive(p:PlayerState){const cls=this.content.classes.find(c=>c.id===p.classId)!;let damage=0,defense=0;for(const item of Object.values(p.equipment)){const d=this.content.items.find(d=>d.id===item.item);if(d&&(!d.durability||item.durability>0)){damage+=d.damage;defense+=d.defense;}}
    p.derived={damage:Math.round(p.stats.strength*cls.scaling.damage+damage),defense:Math.round(p.stats.agility*cls.scaling.defense+defense),maxHP:Math.max(1,Math.round(cls.startingHP+(p.stats.vitality-cls.startingStats.vitality)*cls.scaling.hp)),maxMana:Math.max(1,Math.round(cls.startingMana+(p.stats.energy-cls.startingStats.energy)*cls.scaling.mana)),moveSpeed:cls.moveSpeed*this.content.balance.movementMultiplier,attackSpeed:cls.attackSpeed};
  }
  xpNeeded(level:number){return Math.round(this.content.balance.xpBase*Math.pow(level,this.content.balance.xpExponent));}
  emit(event:Omit<GameEvent,'id'>){this.events.push({...event,id:++this.eventId});if(this.events.length>160)this.events.shift();}
  message(p:Player,text:string){this.emit({type:'message',x:p.x,z:p.z,who:p.id,text});}
  cancel(p:Player){p.path=[];p.target=null;p.pending=null;p.pickup=null;p.gotoNPC=null;p.npc=null;p.motion='idle';}
  action(id:string,input:unknown):boolean{
    const parsed=actionSchema.safeParse(input),p=this.players.get(id);if(!parsed.success||!p||p.hp<=0)return false;
    const a=parsed.data as Action,c=this.content;
    switch(a.type){
      case'move':{if(!inside(a,c.world.bounds))return false;const path=this.nav.path(p,a);this.cancel(p);p.path=path;return !!path.length;}
      case'stop':this.cancel(p);return true;
      case'target':{const m=this.monsters.get(a.id),skill=c.skills.find(s=>s.id===a.skill);if(!m||m.hp<=0||!skill||distance(p,m)>30)return false;this.cancel(p);p.target=m.id;p.skill=skill.id;p.repath=0;return true;}
      case'skill':if(!c.skills.some(s=>s.id===a.id))return false;p.skill=a.id;return true;
      case'pickup':{const l=this.loot.get(a.id);if(!l||(l.owner!==id&&this.time<l.publicAt)||distance(p,l)>30)return false;this.cancel(p);p.pickup=l.id;p.path=this.nav.path(p,l);return true;}
      case'npc':{const n=c.npcs.find(n=>n.id===a.id&&n.enabled);if(!n||distance(p,n)>30)return false;this.cancel(p);p.gotoNPC=n.id;p.path=this.nav.path(p,n);return true;}
      case'buy':{const n=c.npcs.find(n=>n.id===a.npc&&n.enabled),row=n?.shop.find(s=>s.item===a.item),d=c.items.find(i=>i.id===a.item);if(!n||n.interaction!=='shop'||!row||!d||distance(p,n)>2.5||p.crowns<row.price){this.message(p,'Compra rechazada: revisa distancia y Crowns.');return false;}if(['currency','resource'].includes(d.type)||!addItem(c,p,d.id,randomUUID())){this.message(p,'No hay espacio en el inventario.');return false;}p.crowns-=row.price;this.message(p,`${d.name} comprado.`);return true;}
      case'repair':{const n=c.npcs.find(n=>n.id===a.npc&&n.enabled);if(!n||(!n.services.includes('repair')&&n.interaction!=='repair')||distance(p,n)>2.5)return false;const cost=this.repairCost(p);if(p.crowns<cost){this.message(p,'Crowns insuficientes para reparar.');return false;}p.crowns-=cost;for(const i of Object.values(p.equipment))i.durability=c.items.find(d=>d.id===i.item)!.durability;this.derive(p);this.message(p,`Equipo reparado · ${cost} Crowns`);return true;}
      case'equip':{const error=equipItem(c,p,a.uid);if(error){this.message(p,error);return false;}this.derive(p);return true;}
      case'unequip':{const item=p.equipment[a.slot];if(!item)return false;const pos=emptyCell(c,p,item.item);if(!pos){this.message(p,'Inventario lleno');return false;}p.inventory.push({...item,...pos});delete p.equipment[a.slot];this.derive(p);return true;}
      case'bag':{const item=p.inventory.find(i=>i.uid===a.uid);if(!item||!fits(c,p,item.item,a.x,a.y,item.uid))return false;item.x=a.x;item.y=a.y;return true;}
      case'use':{if(this.time<p.potionAt)return false;const i=p.inventory.find(i=>i.item===a.item),d=c.items.find(d=>d.id===i?.item);if(!i||d?.type!=='consumable')return false;const hp=Number(d.properties.restoreHP??0),mana=Number(d.properties.restoreMana??0);if(!hp&&!mana)return false;p.hp=Math.min(p.derived.maxHP,p.hp+hp);p.mana=Math.min(p.derived.maxMana,p.mana+mana);p.inventory=p.inventory.filter(item=>item.uid!==i.uid);p.potionAt=this.time+0.8;return true;}
      case'stat':if(p.points<1)return false;p.points--;p.stats[a.stat]++;this.derive(p);return true;
    }
  }
  repairCost(p:PlayerState){return Math.ceil(Object.values(p.equipment).reduce((n,i)=>n+Math.max(0,(this.content.items.find(d=>d.id===i.item)?.durability??0)-i.durability)*0.3,0));}
  tick(dt:number){
    this.time+=dt;
    for(const p of this.players.values())this.tickPlayer(p,dt);
    for(const m of this.monsters.values())this.tickMonster(m,dt);
    for(const l of this.loot.values())if(l.expiresAt<=this.time)this.loot.delete(l.id);
  }
  tickPlayer(p:Player,dt:number){
    const c=this.content;
    if(p.hp<=0){if(this.time>=p.deadUntil){Object.assign(p,c.world.spawn);p.hp=p.derived.maxHP;p.mana=p.derived.maxMana;p.motion='idle';this.message(p,'Regresaste a Aurelia.');}return;}
    const safe=inside(p,c.world.safeZone);
    p.hp=Math.min(p.derived.maxHP,p.hp+(safe?7:0.18)*dt);p.mana=Math.min(p.derived.maxMana,p.mana+(safe?5:1.2)*dt);
    if(p.pending&&this.time>=p.pending.hitAt){const attack=p.pending;p.pending=null;this.resolveAttack(p,attack.target,attack.skill);}
    if(p.motion==='attack'&&this.time<p.cooldown)return;
    if(p.motion==='attack')p.motion='idle';
    const target=p.target?this.monsters.get(p.target):undefined;
    if(target&&target.hp>0){
      const skill=c.skills.find(s=>s.id===p.skill)!;
      const range=skill.range;
      if(distance(p,target)>range){if(this.time>=p.repath){p.path=this.nav.path(p,target);p.repath=this.time+0.25;}}
      else{p.path=[];p.facing=Math.atan2(target.x-p.x,target.z-p.z);if(this.time>=p.cooldown){
        let active=skill;if(p.mana<skill.mana){active=c.skills.find(s=>s.kind==='normal')!;p.skill=active.id;this.message(p,'Maná insuficiente · ataque normal');}
        p.mana-=active.mana;p.motion='attack';p.animationAt=this.time;p.pending={target:target.id,skill:active.id,hitAt:this.time+active.windup/p.derived.attackSpeed};p.cooldown=this.time+(active.windup+active.recovery)/p.derived.attackSpeed;
      }}
    }else if(p.target){p.target=null;p.path=[];}
    if(p.path.length&&p.motion!=='attack'){const q=p.path[0];p.facing=Math.atan2(q.x-p.x,q.z-p.z);this.nav.move(p,p.path,p.derived.moveSpeed*dt);p.motion=p.path.length?'walk':'idle';}
    else if(p.motion!=='attack')p.motion='idle';
    if(p.pickup){const l=this.loot.get(p.pickup);if(!l){p.pickup=null;p.path=[];}else if(distance(p,l)<1.2){this.collect(p,l);p.pickup=null;p.path=[];}}
    if(p.gotoNPC){const n=c.npcs.find(n=>n.id===p.gotoNPC&&n.enabled);if(n&&distance(p,n)<2.2){p.npc=n.id;p.gotoNPC=null;p.path=[];p.facing=Math.atan2(n.x-p.x,n.z-p.z);}}
    if(p.npc){const n=c.npcs.find(n=>n.id===p.npc);if(!n||distance(p,n)>3)p.npc=null;}
  }
  resolveAttack(p:Player,targetId:string,skillId:string){
    const target=this.monsters.get(targetId),skill=this.content.skills.find(s=>s.id===skillId)!;
    if(!target||target.hp<=0||distance(p,target)>skill.range+0.4)return;
    this.emit({type:'skill',x:p.x,z:p.z,who:p.id,skill:skill.id});
    const victims=skill.kind==='aoe'?[...this.monsters.values()].filter(m=>m.hp>0&&distance(p,m)<=skill.radius):[target];
    for(const m of victims){const def=this.content.monsters.find(d=>d.id===m.def)!;const damage=Math.max(1,Math.round(p.derived.damage*skill.damageMultiplier-def.defense));m.hp=Math.max(0,m.hp-damage);m.victim=p.id;m.motion='hit';m.animationAt=this.time;this.emit({type:'damage',x:m.x,z:m.z,who:m.id,value:damage});if(m.hp===0)this.killMonster(p,m);}
    const weapon=p.equipment.weapon;if(weapon){weapon.durability=Math.max(0,weapon.durability-0.2);this.derive(p);}
  }
  killMonster(p:Player,m:Monster){
    const def=this.content.monsters.find(d=>d.id===m.def)!,spot=this.content.spots.find(s=>s.id===m.spot)!;m.motion='death';m.animationAt=this.time;m.respawnAt=this.time+spot.respawn;m.path=[];m.victim=null;m.hitAt=0;
    this.emit({type:'death',x:m.x,z:m.z,who:m.id});this.gainXP(p,def.xp);
    const table=this.content.dropTables.find(t=>t.id===def.dropTable)!;
    for(const row of table.entries){const item=this.content.items.find(i=>i.id===row.item)!;if(!row.enabled||!item.droppable||(row.monsters.length&&!row.monsters.includes(def.id)))continue;
      const chance=item.id==='eter'?row.chance*this.content.balance.eterChance/0.008:row.chance;
      if(this.random()>=Math.min(1,chance))continue;
      let amount=row.min+Math.floor(this.random()*(row.max-row.min+1));if(item.type==='currency')amount=Math.max(1,Math.round(amount*this.content.balance.crownsMultiplier));
      if(item.type==='currency'&&this.content.balance.crownsMultiplier===0)continue;
      const drops=['currency','resource'].includes(item.type)?1:amount;
      for(let i=0;i<drops;i++){const angle=this.random()*Math.PI*2,r=0.3+this.random()*0.5,pos=this.nav.nearest({x:m.x+Math.cos(angle)*r,z:m.z+Math.sin(angle)*r})??m;
        const id=randomUUID();this.loot.set(id,{id,item:item.id,amount:drops===1?amount:1,...pos,owner:p.id,publicAt:this.time+this.content.balance.lootOwnership,expiresAt:this.time+this.content.balance.lootLifetime});}
    }
  }
  gainXP(p:Player,amount:number){if(p.level>=this.content.balance.maxLevel)return;p.xp+=amount;while(p.level<this.content.balance.maxLevel&&p.xp>=this.xpNeeded(p.level)){p.xp-=this.xpNeeded(p.level);p.level++;p.points+=this.content.balance.pointsPerLevel;p.hp=p.derived.maxHP;p.mana=p.derived.maxMana;this.emit({type:'level',x:p.x,z:p.z,who:p.id,text:`Nivel ${p.level} · +${this.content.balance.pointsPerLevel} puntos`});}if(p.level===this.content.balance.maxLevel)p.xp=0;}
  collect(p:Player,l:LootState){if(l.owner!==p.id&&this.time<l.publicAt)return;
    const def=this.content.items.find(i=>i.id===l.item)!;
    if(def.id==='crowns')p.crowns+=l.amount;else if(def.id==='eter')p.eter+=l.amount;else if(!addItem(this.content,p,l.item,randomUUID())){this.message(p,'Inventario lleno · el objeto queda en el suelo');return;}
    this.loot.delete(l.id);this.emit({type:'loot',x:p.x,z:p.z,who:p.id,text:`+${l.amount} ${def.name}`});
  }
  tickMonster(m:Monster,dt:number){
    const def=this.content.monsters.find(d=>d.id===m.def)!;
    if(m.hp<=0){if(this.time>=m.respawnAt){Object.assign(m,m.home);m.hp=def.hp;m.motion='idle';m.animationAt=this.time;m.victim=null;m.cooldown=this.time+0.5;}return;}
    let p=m.victim?this.players.get(m.victim):undefined;
    if(p&&(p.hp<=0||inside(p,this.content.world.safeZone)||distance(m,m.home)>def.leash||distance(p,m.home)>def.leash+2)){m.victim=null;p=undefined;m.hp=Math.min(def.hp,m.hp+def.hp*dt);m.hitAt=0;}
    if(!p&&def.behavior==='aggressive'){p=[...this.players.values()].filter(p=>p.hp>0&&!inside(p,this.content.world.safeZone)&&distance(p,m)<def.aggroRadius&&distance(p,m.home)<def.leash).sort((a,b)=>distance(a,m)-distance(b,m))[0];if(p)m.victim=p.id;}
    if(m.hitAt&&this.time>=m.hitAt){m.hitAt=0;if(p&&distance(p,m)<def.attackRange+0.4&&!inside(p,this.content.world.safeZone)){const damage=Math.max(1,def.damage-p.derived.defense);p.hp=Math.max(0,p.hp-damage);this.emit({type:'damage',x:p.x,z:p.z,who:p.id,value:damage});for(const i of Object.values(p.equipment))i.durability=Math.max(0,i.durability-0.05);this.derive(p);if(p.hp===0)this.killPlayer(p);}}
    if(m.motion==='hit'&&this.time-m.animationAt<0.2)return;
    if(m.motion==='attack'&&this.time<m.cooldown)return;
    if(p){m.facing=Math.atan2(p.x-m.x,p.z-m.z);if(distance(p,m)<=def.attackRange){m.path=[];if(this.time>=m.cooldown){m.motion='attack';m.animationAt=this.time;m.hitAt=this.time+0.35;m.cooldown=this.time+def.attackSpeed;}return;}if(this.time>=m.repath){m.path=this.nav.path(m,p);m.repath=this.time+0.5;}}
    else if(distance(m,m.home)>0.2){if(this.time>=m.repath){m.path=this.nav.path(m,m.home);m.repath=this.time+1;}m.hp=Math.min(def.hp,m.hp+def.hp*dt*0.3);}
    else if(this.time>m.repath){const a=this.random()*Math.PI*2,q={x:m.home.x+Math.cos(a)*0.8,z:m.home.z+Math.sin(a)*0.8};m.path=this.nav.path(m,q);m.repath=this.time+3+this.random()*3;}
    if(m.path.length){const q=m.path[0];m.facing=Math.atan2(q.x-m.x,q.z-m.z);const old={x:m.x,z:m.z};this.nav.move(m,m.path,def.moveSpeed*dt*(p?1:0.35));
      if(inside(m,this.content.world.safeZone)||[...this.monsters.values()].some(other=>other!==m&&other.hp>0&&distance(m,other)<0.75)){Object.assign(m,old);m.path=[];}m.motion='walk';
    }else m.motion='idle';
  }
  killPlayer(p:Player){this.cancel(p);p.motion='death';p.animationAt=this.time;p.deadUntil=this.time+this.content.balance.death.respawnSeconds;p.xp=Math.floor(p.xp*(1-this.content.balance.death.xpLoss));p.crowns=Math.floor(p.crowns*(1-this.content.balance.death.crownsLoss));this.emit({type:'death',x:p.x,z:p.z,who:p.id});}
  playerState(p:Player):PlayerState{const {path,pickup,gotoNPC,cooldown,pending,repath,potionAt,...state}=p;return structuredClone(state);}
  snapshot(id:string,since=0):Snapshot{const me=this.players.get(id)!;return {type:'state',time:this.time,me:this.playerState(me),players:[...this.players.values()].filter(p=>p!==me).map(p=>this.playerState(p)),monsters:[...this.monsters.values()].map(({home,path,victim,cooldown,hitAt,repath,...state})=>({...state})),loot:[...this.loot.values()].map(l=>({...l})),events:this.events.filter(e=>e.id>since&&(!e.who||!['message','loot','level'].includes(e.type)||e.who===id)),revision:this.revision};}
}
