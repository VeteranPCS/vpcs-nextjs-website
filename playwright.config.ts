import { defineConfig } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';
const origin = new URL(baseURL);
const artifactDir = process.env.E2E_ARTIFACT_DIR ?? `/private/tmp/vpcs-steph-e2e-${origin.port || 'default'}`;
if (!['127.0.0.1','localhost'].includes(origin.hostname)) throw new Error('Redesign browser tests require a loopback development server.');
export default defineConfig({
  testDir:'./e2e', fullyParallel:false, workers:1, timeout:60000,
  expect:{ timeout:10000 }, reporter:[['list'], ['json', { outputFile: `${artifactDir}/results.json` }]],
  outputDir:artifactDir,
  use:{ baseURL, trace:'retain-on-failure', screenshot:'only-on-failure', launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {} },
  projects:[
    {name:'phone-narrow',use:{viewport:{width:360,height:800}}},
    {name:'phone',use:{viewport:{width:390,height:844}}},
    {name:'tablet',use:{viewport:{width:768,height:1024}}},
    {name:'landscape',use:{viewport:{width:1024,height:768}}},
    {name:'desktop',use:{viewport:{width:1440,height:1000}}},
    {name:'wide',use:{viewport:{width:1920,height:1080}}},
  ],
});
