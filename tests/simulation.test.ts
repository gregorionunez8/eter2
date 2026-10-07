import test from 'node:test';
import assert from 'node:assert/strict';
import defaults from '../src/content/default.json';
import { validateContent } from '../src/shared/content';
import { Navigation, distance } from '../src/shared/navigation';
import { addItem, equipItem, fits } from '../src/shared/inventory';
import { Simulation } from '../server/simulation';
const setup=(random=()=>0.5)=>new Simulation(validateContent(structuredClone(defaults)),random);
const advance=(s:Simulation,seconds:number)=>{for(let i=0;i<Math.ceil(seconds*30);i++)s.tick(1/30);};

test('content validation rejects duplicate IDs, negative HP, bad rates, references, map bounds and unsafe spots',()=>{
  const invalids=[(c:any)=>c.npcs.push({...c.npcs[0]}),(c:any)=>c.monsters[0].hp=-1,(c:any)=>c.dropTables[0].entries[0].chance=1.01,(c:any)=>c.npcs[0].shop[0].item='missing',(c:any)=>c.spots[0].x=999,(c:any)=>c.spots[0].z=14,(c:any)=>c.world.spawn.x=-8,(c:any)=>c.classes[0].enabled=false];
  for(const mutate of invalids){const c=structuredClone(defaults);mutate(c);assert.throws(()=>validateContent(c));}
  assert.equal(validateContent(defaults).npcs.length,2);
});
test('navigation crosses the only town exit, avoids landmark obstacles and rejects off-map movement',()=>{
  const c=validateContent(defaults),nav=new Navigation(c),start=c.world.spawn;
  const goal={x:-10,z:16};const path=nav.path(start,goal);assert.ok(path.length>1);let previous=start;for(const next of path){assert.ok(nav.clear(previous,next));previous=next;}
  const s=setup(),p=s.createPlayer('p','Vanguard');assert.equal(s.action(p.id,{type:'move',x:999,z:0}),false);s.action(p.id,{type:'move',x:-4,z:-2});advance(s,5);assert.ok(distance(p,{x:-4,z:-2})<0.1);assert.equal(p.motion,'idle');
  assert.equal(nav.walkable({x:14,z:17}),false);assert.ok(nav.walkable({x:0,z:7}));
});
test('target acquisition auto-approaches and observes attack windup / recovery',()=>{
  const s=setup(),p=s.createPlayer('p','Vanguard'),m=[...s.monsters.values()][0],hp=m.hp;
  assert.ok(s.action(p.id,{type:'target',id:m.id,skill:'strike'}));advance(s,1);assert.equal(m.hp,hp);assert.ok(p.z<17);
  let ticks=0;while(!p.pending&&ticks++<300)s.tick(1/30);assert.ok(p.pending);assert.ok(distance(p,m)<=1.65);assert.equal(m.hp,hp);
  advance(s,0.2);assert.equal(m.hp,hp);advance(s,0.12);assert.ok(m.hp<hp);assert.ok(p.cooldown>s.time);const damaged=m.hp;advance(s,0.3);assert.equal(m.hp,damaged);
  s.action(p.id,{type:'move',x:0,z:15});assert.equal(p.target,null);assert.equal(p.pending,null);
});
test('strong skill consumes mana, hits harder; AoE hits multiple nearby creatures',()=>{
  const s=setup(),p=s.createPlayer('p','Vanguard'),m=[...s.monsters.values()][0];Object.assign(p,{x:m.x,z:m.z+1});
  const normal=Math.round(p.derived.damage)-2;const mana=p.mana;s.action(p.id,{type:'target',id:m.id,skill:'cleave'});s.tick(1/30);assert.ok(p.mana<=mana-7.9);advance(s,0.4);assert.ok(68-m.hp>normal);
  s.action(p.id,{type:'stop'});p.cooldown=0;p.mana=45;const ms=[...s.monsters.values()].filter(m=>m.def==='sproutling');for(let i=0;i<3;i++)Object.assign(ms[i],{x:p.x+0.4*(i+1),z:p.z-0.8,hp:68,victim:null});
  s.action(p.id,{type:'target',id:ms[0].id,skill:'sweep'});advance(s,0.5);assert.ok(ms.slice(0,3).every(m=>m.hp<68));assert.ok(p.mana<35);
});
test('kills grant XP, level-up gives configurable points, deaths drop physical loot, spots respawn',()=>{
  const s=setup(()=>0),p=s.createPlayer('p','Vanguard'),m=[...s.monsters.values()][0];Object.assign(p,{x:m.x,z:m.z+1});s.action(p.id,{type:'target',id:m.id,skill:'strike'});advance(s,5);assert.equal(m.hp,0);assert.equal(p.xp,16);assert.ok(s.loot.size>=4);assert.ok([...s.loot.values()].every(l=>l.owner===p.id&&l.publicAt>s.time));
  s.gainXP(p,100);assert.equal(p.level,2);assert.equal(p.points,5);const damage=p.derived.damage;s.action(p.id,{type:'stat',stat:'strength'});assert.equal(p.stats.strength,23);assert.equal(p.points,4);assert.ok(p.derived.damage>=damage);advance(s,8);assert.equal(m.hp,68);
});
test('loot ownership rejects other players for 30 seconds, currencies and rare resource are server awarded',()=>{
  const s=setup(()=>0),a=s.createPlayer('a','A'),b=s.createPlayer('b','B'),m=[...s.monsters.values()][0];s.killMonster(a,m);
  const crowns=[...s.loot.values()].find(l=>l.item==='crowns')!,eter=[...s.loot.values()].find(l=>l.item==='eter')!;Object.assign(b,{x:crowns.x,z:crowns.z});assert.equal(s.action(b.id,{type:'pickup',id:crowns.id}),false);advance(s,30.1);assert.ok(s.action(b.id,{type:'pickup',id:crowns.id}));s.tick(1/30);assert.ok(b.crowns>100);
  Object.assign(a,{x:eter.x,z:eter.z});assert.ok(s.action(a.id,{type:'pickup',id:eter.id}));s.tick(1/30);assert.equal(a.eter,1);assert.ok(!s.loot.has(eter.id));
});
test('inventory respects item dimensions, swaps equipment atomically, rejects overlap and stat requirements',()=>{
  const s=setup(),p=s.createPlayer('p','Vanguard');assert.ok(addItem(s.content,p,'ironblade','sword2'));const sword=p.inventory.find(i=>i.uid==='sword2')!;assert.ok(sword.y+3<=8);
  assert.equal(fits(s.content,p,'ironblade',7,6),false);const potion=p.inventory[0];assert.equal(s.action(p.id,{type:'bag',uid:sword.uid,x:potion.x,y:potion.y}),false);
  const old=p.equipment.weapon!.uid;assert.equal(equipItem(s.content,p,'sword2'),null);assert.equal(p.equipment.weapon?.uid,'sword2');assert.ok(p.inventory.some(i=>i.uid===old));assert.ok(s.action(p.id,{type:'unequip',slot:'weapon'}));assert.ok(!p.equipment.weapon);
  p.stats.strength=1;assert.equal(equipItem(s.content,p,'sword2'),'No cumples los requisitos');
});
test('shops enforce distance, configured prices, funds, availability and repair',()=>{
  const s=setup(),p=s.createPlayer('p','Vanguard');assert.equal(s.action(p.id,{type:'buy',npc:'brom',item:'ironblade'}),false);Object.assign(p,{x:-4.5,z:16});assert.ok(s.action(p.id,{type:'buy',npc:'brom',item:'ironblade'}));assert.equal(p.crowns,35);assert.equal(s.action(p.id,{type:'buy',npc:'brom',item:'ironblade'}),false);assert.equal(s.action(p.id,{type:'buy',npc:'brom',item:'eter'}),false);
  p.equipment.weapon!.durability=70;assert.equal(s.repairCost(p),3);assert.ok(s.action(p.id,{type:'repair',npc:'brom'}));assert.equal(p.crowns,32);assert.equal(p.equipment.weapon!.durability,80);
  Object.assign(p,{x:4.2,z:18});assert.ok(s.action(p.id,{type:'buy',npc:'lyra',item:'health'}));assert.equal(p.crowns,20);
});
test('client cannot inject HP, XP, money, teleport position, inventory, negative numbers or forged item actions',()=>{
  const s=setup(),p=s.createPlayer('p','Vanguard'),before=s.playerState(p);
  for(const attack of [{type:'move',x:0,z:10,hp:999},{type:'award',xp:999},{type:'money',crowns:999},{type:'teleport',x:0,z:0},{type:'equip',uid:'fake'},{type:'stat',stat:'crowns'},{type:'move',x:NaN,z:0},{type:'buy',npc:'lyra',item:'health',price:-1}])assert.equal(s.action(p.id,attack),false);
  assert.deepEqual(s.playerState(p),before);
});
test('passive creatures do not initiate combat; aggressive wolves leash and respect town safety',()=>{
  const s=setup(),p=s.createPlayer('p','Vanguard'),passive=[...s.monsters.values()][0];Object.assign(p,{x:passive.x,z:passive.z+1});advance(s,2);assert.equal(passive.victim,null);assert.equal(p.hp,p.derived.maxHP);
  const wolf=[...s.monsters.values()].find(m=>m.def==='forestwolf')!;Object.assign(p,{x:wolf.x,z:wolf.z+2});advance(s,0.2);assert.equal(wolf.victim,p.id);Object.assign(p,s.content.world.spawn);advance(s,0.5);assert.equal(wolf.victim,null);
});
test('death applies configured penalties and returns to Aurelia; snapshots omit runtime decisions',()=>{
  const s=setup(),p=s.createPlayer('p','Vanguard');p.xp=20;p.crowns=200;p.hp=0;s.killPlayer(p);assert.equal(p.xp,19);advance(s,3.1);assert.equal(p.hp,p.derived.maxHP);assert.deepEqual({x:p.x,z:p.z},s.content.world.spawn);const snapshot=s.snapshot(p.id);assert.ok(!('pending' in snapshot.me));assert.ok(!('path' in snapshot.me));
});
