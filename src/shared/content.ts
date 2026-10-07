import { z } from 'zod';
import { equipmentSlots,inside } from './geometry';
export { equipmentSlots,inside } from './geometry';

const id = z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/, 'ID: letras minúsculas, números, guion; empieza con letra');
const name = z.string().trim().min(1).max(80);
const positive = z.number().finite().positive();
const nonnegative = z.number().finite().nonnegative();
const position = { x: z.number().finite(), z: z.number().finite() };
const bounds = z.object({ minX:z.number().finite(),maxX:z.number().finite(),minZ:z.number().finite(),maxZ:z.number().finite() });
const stats = z.object({strength:z.number().int().min(0).max(10000),agility:z.number().int().min(0).max(10000),vitality:z.number().int().min(0).max(10000),energy:z.number().int().min(0).max(10000)});
export const itemSchema = z.object({id,name,type:z.enum(['currency','resource','consumable',...equipmentSlots]),model:name,icon:name,width:z.number().int().min(1).max(8),height:z.number().int().min(1).max(8),requirements:stats.partial(),damage:nonnegative,defense:nonnegative,durability:nonnegative,classAffinity:z.array(id),buyPrice:nonnegative,sellPrice:nonnegative,droppable:z.boolean(),tradeable:z.boolean(),properties:z.record(z.string(),z.union([z.number().finite(),z.string().max(200),z.boolean()]))});
export const npcSchema = z.object({id,name,style:z.enum(['blacksmith','merchant']),...position,facing:z.number().finite(),role:name,dialogue:z.string().max(500),interaction:z.enum(['shop','repair','storage','teleporter','trainer','reset','custom']),enabled:z.boolean(),services:z.array(z.enum(['repair'])),shop:z.array(z.object({item:id,price:nonnegative,order:z.number().int().min(0),category:name})).max(40)});
export const monsterSchema = z.object({id,name,style:z.enum(['sproutling','forestwolf']),level:z.number().int().min(1).max(500),hp:positive.max(10000000),damage:nonnegative,defense:nonnegative,xp:nonnegative,moveSpeed:positive.max(20),attackSpeed:positive.min(0.1).max(30),attackRange:positive.max(10),aggroRadius:nonnegative.max(30),leash:positive.max(40),behavior:z.enum(['passive','aggressive']),dropTable:id});
export const spotSchema = z.object({id,name,map:id,monster:id,...position,radius:positive.max(15),quantity:z.number().int().min(1).max(30),respawn:positive.min(1).max(600),enabled:z.boolean()});
export const dropSchema = z.object({id,name,entries:z.array(z.object({item:id,chance:z.number().finite().min(0).max(1),min:z.number().int().min(1).max(100000),max:z.number().int().min(1).max(100000),monsters:z.array(id),enabled:z.boolean()})).max(40)});
export const classSchema = z.object({id,name,enabled:z.boolean(),startingStats:stats,startingPoints:z.number().int().min(0).max(1000).default(0),startingHP:positive,startingMana:positive,moveSpeed:positive.max(15),attackSpeed:positive.min(0.1).max(10),startingWeapon:id,scaling:z.object({damage:nonnegative,defense:nonnegative,hp:nonnegative,mana:nonnegative})});
export const landmarkSchema = z.object({id,name,style:z.enum(['crystal','forge','market','house','wall']),...position,width:positive.max(20),depth:positive.max(20),height:positive.max(12),facing:z.number().finite()});
export const balanceSchema = z.object({xpBase:positive.max(100000),xpExponent:positive.max(5),pointsPerLevel:z.number().int().min(0).max(100),maxLevel:z.number().int().min(2).max(500),crownsMultiplier:nonnegative.max(100),eterChance:z.number().min(0).max(1),lootOwnership:nonnegative.max(600),lootLifetime:positive.min(30).max(3600),movementMultiplier:positive.min(0.25).max(3),death:z.object({xpLoss:z.number().min(0).max(1),crownsLoss:z.number().min(0).max(1),respawnSeconds:nonnegative.max(60)}),daylight:z.number().min(0.2).max(1.5)});
export const contentSchema = z.object({version:z.literal(1),world:z.object({id,name,bounds,spawn:z.object(position),safeZone:bounds,camera:z.object({height:positive,offsetX:positive,offsetZ:positive,viewSize:positive,minView:positive,maxView:positive}),landmarks:z.array(landmarkSchema).max(40)}),classes:z.array(classSchema).min(1).max(12),skills:z.array(z.object({id,name,kind:z.enum(['normal','strong','aoe']),damageMultiplier:positive.max(10),mana:nonnegative,range:positive.max(10),radius:nonnegative.max(10),windup:positive.min(0.1),recovery:positive.min(0.1),color:z.string().regex(/^#[a-fA-F0-9]{6}$/)})).length(3),monsters:z.array(monsterSchema).min(1).max(30),spots:z.array(spotSchema).max(30),items:z.array(itemSchema).min(1).max(100),dropTables:z.array(dropSchema).max(30),npcs:z.array(npcSchema).max(30),balance:balanceSchema});
export type Content = z.infer<typeof contentSchema>;
export type ItemDef = Content['items'][number];
export type Stats = z.infer<typeof stats>;
export type Vec2 = {x:number;z:number};
export type Bounds = z.infer<typeof bounds>;

export function validateContent(input:unknown):Content {
  const c=contentSchema.parse(input), errors:string[]=[];
  for(const key of ['classes','skills','monsters','spots','items','dropTables','npcs'] as const){ const ids=new Set<string>(); for(const row of c[key]){if(ids.has(row.id)) errors.push(`${key}: ID duplicado ${row.id}`); ids.add(row.id);} }
  const exists=(key:'items'|'monsters'|'dropTables'|'classes',value:string,path:string)=>{if(!c[key].some(row=>row.id===value)) errors.push(`${path}: referencia inválida ${value}`);};
  const b=c.world.bounds;
  if(b.minX>=b.maxX||b.minZ>=b.maxZ||b.maxX-b.minX>128||b.maxZ-b.minZ>128)errors.push('Mapa: límites inválidos (máximo 128 unidades)');
  const checkPosition=(p:Vec2,path:string)=>{if(!inside(p,b,0.6))errors.push(`${path}: posición fuera del mapa`);};
  checkPosition(c.world.spawn,'Spawn');
  const safe=c.world.safeZone;
  if(safe.minX>=safe.maxX||safe.minZ>=safe.maxZ||!inside({x:safe.minX,z:safe.minZ},b)||!inside({x:safe.maxX,z:safe.maxZ},b))errors.push('Zona segura: límites inválidos');
  if(!inside(c.world.spawn,safe))errors.push('Spawn debe estar dentro de la zona segura');
  const camera=c.world.camera;
  if(camera.minView<14||camera.maxView>30||camera.minView>camera.viewSize||camera.viewSize>camera.maxView)errors.push('Cámara: zoom debe quedar entre 14 y 30; default dentro del rango');
  const landmarkIds=new Set<string>();
  for(const l of c.world.landmarks){if(landmarkIds.has(l.id))errors.push(`Landmark: ID duplicado ${l.id}`);landmarkIds.add(l.id);checkPosition(l,l.name);if(!inside({x:l.x-l.width/2,z:l.z-l.depth/2},b)||!inside({x:l.x+l.width/2,z:l.z+l.depth/2},b))errors.push(`${l.name}: edificio fuera del mapa`);}
  for(const n of c.npcs){checkPosition(n,n.name);for(const s of n.shop)exists('items',s.item,n.name);}
  let population=0;
  for(const s of c.spots){exists('monsters',s.monster,s.name);checkPosition(s,s.name);if(s.map!==c.world.id)errors.push(`${s.name}: mapa inválido`);if(s.enabled)population+=s.quantity;if(!inside({x:s.x-s.radius,z:s.z-s.radius},b,0.6)||!inside({x:s.x+s.radius,z:s.z+s.radius},b,0.6))errors.push(`${s.name}: radio fuera del mapa`);if(s.x+s.radius>=safe.minX&&s.x-s.radius<=safe.maxX&&s.z+s.radius>=safe.minZ&&s.z-s.radius<=safe.maxZ)errors.push(`${s.name}: spot intersecta zona segura`);}
  if(population>150)errors.push('Máximo 150 criaturas activas en el prototipo');
  for(const m of c.monsters)exists('dropTables',m.dropTable,m.name);
  for(const t of c.dropTables)for(const e of t.entries){exists('items',e.item,t.name);for(const m of e.monsters)exists('monsters',m,t.name);if(e.max<e.min)errors.push(`${t.name}: máximo menor que mínimo`);}
  for(const cls of c.classes)exists('items',cls.startingWeapon,cls.name);
  if(c.classes.filter(row=>row.enabled).length!==1||!c.classes.some(row=>row.id==='vanguard'&&row.enabled))errors.push('Goal 0: únicamente Vanguard activo');
  for(const i of c.items){for(const affinity of i.classAffinity)exists('classes',affinity,i.name);for(const prop of ['restoreHP','restoreMana'])if(prop in i.properties&&(typeof i.properties[prop]!=='number'||Number(i.properties[prop])<0))errors.push(`${i.name}: ${prop} debe ser un número no negativo`);}
  for(const required of ['crowns','eter','health','mana','chest','boots']) if(!c.items.some(i=>i.id===required))errors.push(`Falta objeto base: ${required}`);
  if(c.skills.map(s=>s.kind).sort().join(',')!=='aoe,normal,strong')errors.push('Se requieren ataque normal, fuerte y AoE');
  const collides=(p:Vec2)=>c.world.landmarks.some(l=>Math.abs(p.x-l.x)<l.width/2+0.4&&Math.abs(p.z-l.z)<l.depth/2+0.4);
  if(collides(c.world.spawn))errors.push('Spawn dentro de un obstáculo');
  for(const n of c.npcs)if(collides(n))errors.push(`${n.name}: NPC dentro de un obstáculo`);
  if(errors.length)throw new Error(errors.join('\n'));
  return c;
}
