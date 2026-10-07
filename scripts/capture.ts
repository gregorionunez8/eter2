import { chromium } from '@playwright/test';
import { mkdirSync,writeFileSync } from 'node:fs';
const browser=await chromium.launch({headless:true,channel:'chromium'});
const page=await browser.newPage({viewport:{width:1440,height:900}});
if(process.env.ETER_NO_RENDER)await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
const errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text());});page.on('websocket',w=>{console.log('WS',w.url());w.on('socketerror',e=>console.log('WS ERROR',e));w.on('framereceived',e=>{const type=JSON.parse(e.payload.toString()).type;if(type==='welcome')console.log('WELCOME received');});});page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
await page.goto(process.env.ETER_URL??'http://127.0.0.1:5173');
try{await page.waitForFunction(()=>!!(window as any).eter?.state,undefined,{timeout:60000});}catch{console.log('BODY',await page.locator('body').innerText());console.log('ERRORS',errors);await page.screenshot({path:'test-results/boot-failure.png'});await browser.close();process.exit(1);}
await page.waitForTimeout(2000);
mkdirSync('docs/evidence',{recursive:true});
await page.screenshot({path:'docs/evidence/aurelia.png'});
const initial=await page.evaluate(()=>({fps:(window as any).eter.scene.fps,drawCalls:(window as any).eter.scene.drawCalls,triangles:(window as any).eter.scene.triangles,zoom:(window as any).eter.scene.view,player:(window as any).eter.state.me}));
console.log(JSON.stringify({errors,render:initial}));
writeFileSync('docs/evidence/initial-render.json',JSON.stringify({errors,render:initial},null,2));
await browser.close();
