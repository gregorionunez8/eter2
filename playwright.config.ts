import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
export const browserDataDir=process.env.ETER_BROWSER_DATA??mkdtempSync(join(tmpdir(),'eter-browser-'));
process.env.ETER_BROWSER_DATA=browserDataDir;
export default defineConfig({
  testDir:'tests/browser',timeout:180000,expect:{timeout:15000},fullyParallel:false,workers:1,
  use:{baseURL:'http://127.0.0.1:3101',viewport:{width:1440,height:900},launchOptions:{channel:'chromium'},trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'npm run start',url:'http://127.0.0.1:3101/api/health',timeout:30000,reuseExistingServer:false,env:{PORT:'3101',ETER_DATA_DIR:browserDataDir}},
  reporter:[['list'],['html',{open:'never'}]]
});
