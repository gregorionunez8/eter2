import './style.css';
import { GameScene } from './client/scene';
import { GameUI } from './client/ui';
import type { Admin } from './client/admin';
import { preloadArt } from './client/art';
import type { Action, Snapshot, Welcome } from './shared/protocol';
const root=document.querySelector<HTMLElement>('#app')!;
root.innerHTML='<div class="boot"><span>◇</span><h1>ÉTER</h1><p>Abriendo las puertas de Aurelia…</p></div>';
let ws:WebSocket,ui:GameUI,scene:GameScene,admin:Admin;
let retry=0,connected=false,hasStarted=false;
function send(action:Action){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(action));}
async function connect(){
  try{
    if(!hasStarted)await preloadArt();
    const session=await fetch('/api/session');if(!session.ok)throw new Error('El servidor de mundo no responde.');
    ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/world`);
    ws.onmessage=e=>{
      const data=JSON.parse(e.data) as Welcome|Snapshot;
      if(data.type==='welcome'){
        if(!hasStarted){hasStarted=true;ui=new GameUI(root,data.content,send);scene=new GameScene(root.querySelector('#world-canvas')!,root.querySelector('#world-labels')!,data.content,(pick,right)=>{
          if(pick.kind==='ground'){if(!right)send({type:'move',...pick.point});}
          else if(pick.kind==='monster')send({type:'target',id:pick.id,skill:right&&ui.chosenSkill===ui.content.skills[0].id?ui.content.skills[1].id:ui.chosenSkill});
          else if(pick.kind==='loot')send({type:'pickup',id:pick.id});else send({type:'npc',id:pick.id});
        });ui.adminOpen=async()=>{if(!admin){const {Admin}=await import('./client/admin');admin=new Admin(root);}await admin.open();};const frame=(now:number)=>{scene.frame(now);if(scene.frameCount%30===0)ui.performance(scene);window.setTimeout(()=>requestAnimationFrame(frame),scene.softwareRenderer?16:4);};requestAnimationFrame(frame);
        }else{scene.setContent(data.content);ui.setContent(data.content);}
        connected=true;retry=0;root.querySelector<HTMLElement>('#connection')!.hidden=true;
      }else{scene.receive(data);ui.update(data);}
    };
    ws.onclose=e=>{connected=false;if(hasStarted){const el=root.querySelector<HTMLElement>('#connection')!;el.hidden=false;el.textContent=e.code===4001?'Cuenta conectada en otra ventana. Recarga para volver aquí.':'Conexión perdida · reconectando…';}if(e.code!==4001)window.setTimeout(connect,Math.min(10000,1000*++retry));};
    ws.onerror=()=>{};
  }catch(e){root.querySelector('.boot p')?.replaceChildren(document.createTextNode(`${(e as Error).message} Reintentando…`));window.setTimeout(connect,3000);}
}
connect();
// Read-only diagnostics for browser verification; actions always travel through the public protocol.
Object.defineProperty(window,'eter',{get:()=>({connected,state:ui?.state,scene:scene?{view:scene.view,fps:scene.fps,drawCalls:scene.drawCalls,triangles:scene.triangles,project:(x:number,y:number,z:number)=>scene.project({x,y,z,clone(){return scene.focus.clone().set(x,y,z);}} as any)}:null})});
