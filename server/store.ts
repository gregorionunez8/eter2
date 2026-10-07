import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { PlayerState } from '../src/shared/protocol';
import type { Content } from '../src/shared/content';
export class Store {
  db:DatabaseSync;
  constructor(path:string){this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE, password TEXT, character TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, account TEXT NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS config(id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);`);}
  guest(){const id=randomUUID(),name=`Vanguard ${id.slice(0,4)}`;this.db.prepare('INSERT INTO accounts(id,name) VALUES (?,?)').run(id,name);return{id,name};}
  session(account:string){const token=randomBytes(32).toString('hex');this.db.prepare('INSERT INTO sessions(token,account,expires) VALUES (?,?,?)').run(token,account,Date.now()+30*86400000);return token;}
  account(token:string|undefined){if(!token)return null;const row=this.db.prepare('SELECT a.* FROM accounts a JOIN sessions s ON s.account=a.id WHERE s.token=? AND s.expires>?').get(token,Date.now()) as {id:string;name:string;username:string|null;password:string|null;character:string|null}|undefined;return row??null;}
  register(id:string,username:string,password:string){const salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');this.db.prepare('UPDATE accounts SET username=?,name=?,password=? WHERE id=? AND username IS NULL').run(username,username,`${salt}:${hash}`,id);}
  login(username:string,password:string){const row=this.db.prepare('SELECT id,password FROM accounts WHERE username=?').get(username) as {id:string;password:string}|undefined;if(!row)return null;const [salt,hash]=row.password.split(':'),computed=scryptSync(password,salt,64);return timingSafeEqual(computed,Buffer.from(hash,'hex'))?row.id:null;}
  save(p:PlayerState){this.db.prepare('UPDATE accounts SET character=? WHERE id=?').run(JSON.stringify(p),p.id);}
  config():unknown{const row=this.db.prepare('SELECT value FROM config WHERE id=1').get() as {value:string}|undefined;return row?JSON.parse(row.value):null;}
  saveConfig(c:Content){this.db.prepare('INSERT INTO config(id,value) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(c));}
  characters(){return (this.db.prepare('SELECT id,name,username,character FROM accounts').all() as {id:string;name:string;username:string|null;character:string|null}[]).map(a=>({id:a.id,name:a.name,registered:!!a.username,character:a.character?JSON.parse(a.character) as PlayerState:null}));}
  close(){this.db.close();}
}
