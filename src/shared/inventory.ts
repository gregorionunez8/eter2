import { equipmentSlots, type Content, type Stats } from './content';
export type Slot=typeof equipmentSlots[number];
export type ItemInstance={uid:string;item:string;x:number;y:number;durability:number};
export type Bag={inventory:ItemInstance[];equipment:Partial<Record<Slot,ItemInstance>>;stats:Stats;classId:string};
export const BAG_WIDTH=8, BAG_HEIGHT=8;
export function fits(c:Content,bag:Bag,item:string,x:number,y:number,ignore?:string){
  const d=c.items.find(i=>i.id===item);if(!d||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+d.width>BAG_WIDTH||y+d.height>BAG_HEIGHT)return false;
  return !bag.inventory.some(i=>{if(i.uid===ignore)return false;const other=c.items.find(d=>d.id===i.item);return other&&x<i.x+other.width&&x+d.width>i.x&&y<i.y+other.height&&y+d.height>i.y;});
}
export function emptyCell(c:Content,bag:Bag,item:string){for(let y=0;y<BAG_HEIGHT;y++)for(let x=0;x<BAG_WIDTH;x++)if(fits(c,bag,item,x,y))return{x,y};return null;}
export function addItem(c:Content,bag:Bag,item:string,uid:string){const pos=emptyCell(c,bag,item),def=c.items.find(i=>i.id===item);if(!pos||!def)return false;bag.inventory.push({uid,item,...pos,durability:def.durability});return true;}
export function equipItem(c:Content,bag:Bag,uid:string):string|null{
  const item=bag.inventory.find(i=>i.uid===uid),def=c.items.find(i=>i.id===item?.item);if(!item||!def)return 'Objeto inexistente';
  if(!equipmentSlots.includes(def.type as Slot))return 'Este objeto no se equipa';
  if(def.classAffinity.length&&!def.classAffinity.includes(bag.classId))return 'Clase incompatible';
  if(Object.entries(def.requirements).some(([key,n])=>bag.stats[key as keyof Stats]<(n??0)))return 'No cumples los requisitos';
  const slot=def.type as Slot,old=bag.equipment[slot];
  const remaining=bag.inventory.filter(i=>i.uid!==uid);let oldPosition:null|{x:number;y:number}=null;
  if(old){oldPosition=emptyCell(c,{...bag,inventory:remaining},old.item);if(!oldPosition)return 'Sin espacio para el equipo anterior';}
  bag.inventory=remaining;if(old&&oldPosition)bag.inventory.push({...old,...oldPosition});bag.equipment[slot]=item;return null;
}
