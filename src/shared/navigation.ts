import { inside, type Content, type Vec2 } from './content';
export const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Navigation {
  readonly step=0.75;
  constructor(readonly content:Content){}
  walkable(p:Vec2,radius=0.38){
    if(!inside(p,this.content.world.bounds,radius))return false;
    const s=this.content.world.safeZone;
    if(p.z>=s.minZ-radius&&p.z<=s.maxZ+radius&&(Math.abs(p.x-s.minX)<0.15+radius||Math.abs(p.x-s.maxX)<0.15+radius))return false;
    if(p.x>=s.minX-radius&&p.x<=s.maxX+radius&&Math.abs(p.z-s.maxZ)<0.15+radius)return false;
    return !this.content.world.landmarks.some(l=>Math.abs(p.x-l.x)<l.width/2+radius&&Math.abs(p.z-l.z)<l.depth/2+radius);
  }
  clear(a:Vec2,b:Vec2){const n=Math.ceil(distance(a,b)/0.25);for(let i=1;i<=n;i++)if(!this.walkable({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;}
  nearest(p:Vec2):Vec2|null{
    if(this.walkable(p))return {...p};
    for(let r=0.5;r<=5;r+=0.5)for(let i=0;i<24;i++){const a=i*Math.PI/12,q={x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r};if(this.walkable(q))return q;}
    return null;
  }
  path(from:Vec2,to:Vec2):Vec2[]{
    if(!inside(to,this.content.world.bounds))return [];
    const goal=this.nearest(to);if(!goal)return [];
    if(this.clear(from,goal))return [goal];
    const b=this.content.world.bounds,s=this.step;
    const point=(x:number,z:number):Vec2=>({x:b.minX+x*s,z:b.minZ+z*s});
    const grid=(p:Vec2)=>({x:Math.round((p.x-b.minX)/s),z:Math.round((p.z-b.minZ)/s)});
    const key=(p:Vec2)=>`${p.x},${p.z}`,start=grid(from),end=grid(goal);
    type Node={x:number;z:number;g:number;f:number;parent?:Node};
    const open:Node[]=[{...start,g:0,f:distance(start,end)}],cost=new Map([[key(start),0]]);let found:Node|undefined;
    for(let steps=0;open.length&&steps<20000;steps++){
      let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
      const n=open.splice(best,1)[0];
      if(n.g>(cost.get(key(n))??Infinity))continue;
      if(distance(n,end)<1.5&&this.clear(point(n.x,n.z),goal)){found=n;break;}
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const q={x:n.x+dx,z:n.z+dz},p=point(q.x,q.z),g=n.g+Math.hypot(dx,dz);
        if(!this.walkable(p)||!this.clear(point(n.x,n.z),p)||g>=(cost.get(key(q))??Infinity))continue;
        cost.set(key(q),g);open.push({...q,g,f:g+distance(q,end),parent:n});
      }
    }
    if(!found)return [];
    const raw:Vec2[]=[goal];for(let n:Node|undefined=found;n;n=n.parent)raw.unshift(point(n.x,n.z));
    raw[0]={...from};const result:Vec2[]=[];let current=0;
    while(current<raw.length-1){let next=raw.length-1;while(next>current+1&&!this.clear(raw[current],raw[next]))next--;result.push(raw[next]);current=next;}
    return result;
  }
  move(pos:Vec2,path:Vec2[],amount:number){
    while(path.length&&amount>0){const q=path[0],d=distance(pos,q);if(d<=amount){pos.x=q.x;pos.z=q.z;path.shift();amount-=d;}else{const next={x:pos.x+(q.x-pos.x)*amount/d,z:pos.z+(q.z-pos.z)*amount/d};if(this.walkable(next)){pos.x=next.x;pos.z=next.z;}else path.length=0;break;}}
  }
}
