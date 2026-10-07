import type { Bounds,Vec2 } from './content';
export const equipmentSlots = ['weapon','chest','boots','helmet','pants','gloves','offhand','wings','necklace','ring1','ring2'] as const;
export function inside(p:Vec2,b:Bounds,margin=0) { return p.x>=b.minX+margin && p.x<=b.maxX-margin && p.z>=b.minZ+margin && p.z<=b.maxZ-margin; }
