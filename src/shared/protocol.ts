import type { Content, Stats, Vec2 } from './content';
import type { ItemInstance, Slot } from './inventory';
export type Action=
  |{type:'move';x:number;z:number}|{type:'target';id:string;skill:string}|{type:'skill';id:string}
  |{type:'stop'}|{type:'pickup';id:string}|{type:'npc';id:string}|{type:'buy';npc:string;item:string}
  |{type:'repair';npc:string}|{type:'equip';uid:string}|{type:'unequip';slot:Slot}
  |{type:'bag';uid:string;x:number;y:number}|{type:'use';item:string}|{type:'stat';stat:keyof Stats};
export type Derived={damage:number;defense:number;maxHP:number;maxMana:number;moveSpeed:number;attackSpeed:number};
export type PlayerState=Vec2&{id:string;name:string;classId:string;level:number;xp:number;points:number;stats:Stats;hp:number;mana:number;crowns:number;eter:number;inventory:ItemInstance[];equipment:Partial<Record<Slot,ItemInstance>>;target:string|null;skill:string;facing:number;motion:string;animationAt:number;deadUntil:number;npc:string|null;derived:Derived};
export type MonsterState=Vec2&{id:string;def:string;spot:string;hp:number;maxHP:number;facing:number;motion:string;animationAt:number;respawnAt:number};
export type LootState=Vec2&{id:string;item:string;amount:number;owner:string;publicAt:number;expiresAt:number};
export type GameEvent={id:number;type:'damage'|'skill'|'death'|'loot'|'level'|'message';x:number;z:number;value?:number;text?:string;who?:string;skill?:string};
export type Snapshot={type:'state';time:number;me:PlayerState;players:PlayerState[];monsters:MonsterState[];loot:LootState[];events:GameEvent[];revision:number};
export type Welcome={type:'welcome';content:Content;playerId:string;revision:number};
