import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import defaults from '../src/content/default.json';
import { validateContent } from '../src/shared/content';
import { Simulation } from '../server/simulation';
import { Store } from '../server/store';
test('SQLite persists account, character progression, bag, equipment, currencies, position and config across reopening',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eter-test-')),path=join(dir,'world.sqlite');
  try{let store=new Store(path),account=store.guest(),token=store.session(account.id);store.register(account.id,'tester','test-password');assert.equal(store.login('tester','wrong-password'),null);assert.equal(store.login('tester','test-password'),account.id);
    const sim=new Simulation(validateContent(defaults)),p=sim.createPlayer(account.id,'tester');p.level=4;p.xp=33;p.points=9;p.stats.strength+=6;p.crowns=438;p.eter=2;p.x=1;p.z=13;p.equipment.weapon!.durability=33;sim.action(p.id,{type:'bag',uid:p.inventory[0].uid,x:7,y:7});store.save(sim.playerState(p));const config=validateContent(defaults);config.balance.xpBase=80;store.saveConfig(config);store.close();
    store=new Store(path);const restored=store.account(token)!;assert.equal(restored.username,'tester');const saved=JSON.parse(restored.character!);assert.deepEqual(saved,sim.playerState(p));const sim2=new Simulation(validateContent(store.config())),p2=sim2.createPlayer(account.id,'tester',saved);assert.equal(p2.level,4);assert.equal(p2.eter,2);assert.equal(p2.equipment.weapon!.durability,33);assert.equal(p2.inventory[0].x,7);assert.equal(sim2.content.balance.xpBase,80);store.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});
