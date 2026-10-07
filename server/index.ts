import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import defaults from '../src/content/default.json';
import { validateContent } from '../src/shared/content';
import type { PlayerState } from '../src/shared/protocol';
import { Simulation } from './simulation';
import { Store } from './store';

const data=resolve(process.env.ETER_DATA_DIR??'.data');mkdirSync(data,{recursive:true});
const tokenFile=join(data,'admin-token.txt');if(!existsSync(tokenFile))writeFileSync(tokenFile,randomBytes(32).toString('hex'),{mode:0o600});
const adminToken=process.env.ETER_ADMIN_TOKEN??readFileSync(tokenFile,'utf8').trim();
const store=new Store(join(data,'eter.sqlite')),sim=new Simulation(validateContent(store.config()??defaults));
const adminSessions=new Map<string,number>(),clients=new Map<string,{ws:WebSocket;since:number;revision:number}>();
const rate=new Map<string,{time:number;count:number}>();
const port=Number(process.env.PORT??3001),host=process.env.HOST??'127.0.0.1';
const cookie=(req:IncomingMessage,key:string)=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${key}=`))?.slice(key.length+1);
function originAllowed(req:IncomingMessage){const origin=req.headers.origin;if(!origin)return true;try{return new URL(origin).host===req.headers.host || (process.env.ETER_ORIGINS??'').split(',').includes(origin);}catch{return false;}}
function respond(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req:IncomingMessage){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>200000)throw new Error('Solicitud demasiado grande');}return JSON.parse(raw||'{}');}
function authenticate(req:IncomingMessage){return store.account(cookie(req,'eter_session'));}
function admin(req:IncomingMessage){const key=cookie(req,'eter_admin');return !!key&&(adminSessions.get(key)??0)>Date.now();}
function issueCookie(req:IncomingMessage,res:ServerResponse,name:string,token:string,maxAge:number){res.setHeader('Set-Cookie',`${name}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);}
const server=createServer(async(req,res)=>{
  const url=new URL(req.url??'/',`http://${req.headers.host}`);
  try{
    if(!originAllowed(req))return respond(res,403,{error:'Origen rechazado'});
    if(req.method!=='GET'&&req.method!=='HEAD'&&req.headers['content-type']!=='application/json')return respond(res,415,{error:'Se requiere JSON'});
    if(url.pathname==='/api/session'&&req.method==='GET'){
      let account=authenticate(req);if(!account){const guest=store.guest();issueCookie(req,res,'eter_session',store.session(guest.id),30*86400);account={...guest,username:null,password:null,character:null};}
      return respond(res,200,{id:account.id,name:account.name,registered:!!account.username});
    }
    if((url.pathname==='/api/register'||url.pathname==='/api/login')&&req.method==='POST'){
      const address=req.socket.remoteAddress??'local',r=rate.get(address)??{time:Date.now(),count:0};if(Date.now()-r.time>60000){r.time=Date.now();r.count=0;}rate.set(address,r);if(++r.count>10)return respond(res,429,{error:'Espera un minuto antes de volver a intentar.'});
      const input=z.object({username:z.string().regex(/^[a-zA-Z0-9_-]{3,24}$/),password:z.string().min(8).max(100)}).strict().parse(await body(req));
      if(url.pathname==='/api/register'){const a=authenticate(req);if(!a||a.username)return respond(res,409,{error:'Esta cuenta ya está registrada'});store.register(a.id,input.username,input.password);const p=sim.players.get(a.id);if(p)p.name=input.username;return respond(res,200,{ok:true});}
      const id=store.login(input.username,input.password);if(!id)return respond(res,401,{error:'Credenciales inválidas'});issueCookie(req,res,'eter_session',store.session(id),30*86400);return respond(res,200,{ok:true});
    }
    if(url.pathname==='/api/admin/login'&&req.method==='POST'){
      const address=`admin:${req.socket.remoteAddress}`,r=rate.get(address)??{time:Date.now(),count:0};if(Date.now()-r.time>60000){r.time=Date.now();r.count=0;}rate.set(address,r);if(++r.count>10)return respond(res,429,{error:'Demasiados intentos'});
      const {token}=z.object({token:z.string().max(256)}).strict().parse(await body(req));const a=Buffer.from(token),b=Buffer.from(adminToken);if(a.length!==b.length||!timingSafeEqual(a,b))return respond(res,401,{error:'Clave administrativa inválida'});
      const key=randomBytes(32).toString('hex');adminSessions.set(key,Date.now()+8*3600000);issueCookie(req,res,'eter_admin',key,8*3600);return respond(res,200,{ok:true});
    }
    if(url.pathname.startsWith('/api/admin/')){
      if(!admin(req))return respond(res,401,{error:'Se requiere acceso administrativo'});
      if(url.pathname==='/api/admin/content'&&req.method==='GET')return respond(res,200,{content:sim.content,revision:sim.revision});
      if(url.pathname==='/api/admin/players'&&req.method==='GET')return respond(res,200,store.characters().map(a=>({id:a.id,name:a.name,registered:a.registered,online:clients.has(a.id),character:sim.players.has(a.id)?sim.playerState(sim.players.get(a.id)!):a.character})));
      if(url.pathname==='/api/admin/content'&&req.method==='PUT'){
        const input=z.object({content:z.unknown(),revision:z.number().int()}).strict().parse(await body(req));if(input.revision!==sim.revision)return respond(res,409,{error:'Otra sesión cambió el contenido. Recarga antes de guardar.'});
        const next=validateContent(input.content);
        // Avoid orphaning saved inventories or changing footprints underneath live items.
        for(const account of store.characters()){const player=sim.players.get(account.id)??account.character;if(!player)continue;for(const instance of [...player.inventory,...Object.values(player.equipment)]){const old=sim.content.items.find(i=>i.id===instance.item),now=next.items.find(i=>i.id===instance.item);if(!now||now.width!==old?.width||now.height!==old?.height||now.type!==old?.type)throw new Error(`${instance.item}: usado por un personaje; no se puede eliminar o cambiar tamaño/tipo`);}}
        store.saveConfig(next);sim.replaceContent(next);return respond(res,200,{ok:true,revision:sim.revision});
      }
      return respond(res,404,{error:'Ruta administrativa inexistente'});
    }
    if(url.pathname==='/api/health')return respond(res,200,{ok:true,players:clients.size,tickHz:30,snapshotHz:15});
    if(url.pathname.startsWith('/api/'))return respond(res,404,{error:'Ruta inexistente'});
    const dist=resolve('dist'),requested=resolve(dist,`.${decodeURIComponent(url.pathname)}`);
    if(!requested.startsWith(dist+'\\')&&!requested.startsWith(dist+'/')&&requested!==dist)return respond(res,403,{error:'Ruta rechazada'});
    const file=existsSync(requested)&&extname(requested)?requested:join(dist,'index.html');if(!existsSync(file))return respond(res,404,{error:'Ejecuta npm run dev o npm run build'});
    const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(readFileSync(file));
  }catch(error){respond(res,400,{error:error instanceof Error?error.message:'Solicitud inválida'});}
});
const wss=new WebSocketServer({noServer:true,maxPayload:4096});
server.on('upgrade',(req,socket,head)=>{
  const a=authenticate(req);if(req.url!=='/world'||!a||!originAllowed(req)||!req.headers.origin){socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{
    const old=clients.get(a.id);if(old)old.ws.close(4001,'Cuenta conectada en otra ventana');
    let p=sim.players.get(a.id);if(!p)p=sim.createPlayer(a.id,a.name,a.character?JSON.parse(a.character) as PlayerState:undefined);
    const client={ws,since:sim.eventId,revision:sim.revision};clients.set(a.id,client);
    ws.send(JSON.stringify({type:'welcome',content:sim.content,playerId:a.id,revision:sim.revision}));
    ws.send(JSON.stringify(sim.snapshot(a.id,client.since)));
    let windowStart=Date.now(),count=0;
    ws.on('message',raw=>{if(clients.get(a.id)!==client)return;if(Date.now()-windowStart>=1000){windowStart=Date.now();count=0;}if(++count>25)return;try{sim.action(a.id,JSON.parse(raw.toString()));}catch{/* Reject malformed intents; no client state is applied. */}});
    ws.on('close',()=>{if(clients.get(a.id)!==client)return;store.save(sim.playerState(sim.players.get(a.id)!));sim.players.delete(a.id);clients.delete(a.id);});
  });
});
let ticks=0;
const loop=setInterval(()=>{
  sim.tick(1/30);ticks++;
  if(ticks%2===0)for(const [id,c] of clients){if(c.ws.readyState!==WebSocket.OPEN)continue;if(c.revision!==sim.revision){c.ws.send(JSON.stringify({type:'welcome',content:sim.content,playerId:id,revision:sim.revision}));c.revision=sim.revision;}c.ws.send(JSON.stringify(sim.snapshot(id,c.since)));c.since=sim.eventId;}
  if(ticks%60===0)for(const p of sim.players.values())store.save(sim.playerState(p));
  if(ticks%900===0){for(const [key,until] of adminSessions)if(until<Date.now())adminSessions.delete(key);for(const [key,r] of rate)if(Date.now()-r.time>60000)rate.delete(key);}
},1000/30);
function shutdown(){clearInterval(loop);for(const p of sim.players.values())store.save(sim.playerState(p));for(const c of clients.values())c.ws.close();server.close(()=>{store.close();process.exit(0);});setTimeout(()=>process.exit(0),1500).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
server.listen(port,host,()=>{console.log(`Éter world: http://${host}:${port} · 30 Hz · SQLite ${data}`);console.log(`Admin key file: ${tokenFile} (no se envía al cliente)`);});
