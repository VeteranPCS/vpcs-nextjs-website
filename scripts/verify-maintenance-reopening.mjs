/** Mock-only deployment rehearsal. Run: node scripts/verify-maintenance-reopening.mjs
 * Copies source (never .env files) into temporary fixtures; no production services.
 * Requires the repo's Playwright Chromium. Leaves logs/screenshots in the printed temp path.
 */
import { mkdtemp, mkdir, cp, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = await mkdtemp(path.join(tmpdir(), 'vpcs-reopening-'));
const next = path.join(repo, 'node_modules/next/dist/bin/next');
const children = [];
let browser, proxy;
const guard = path.join(root, 'block-outbound.cjs');
await writeFile(guard, `function forbidden(){require('node:fs').appendFileSync(process.env.FIXTURE_NETWORK_VIOLATIONS,'Unexpected outbound access\\n');throw new Error('External network forbidden in maintenance fixture');}
const net=require('node:net'); const original=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const raw=Array.isArray(args[0])?args[0][0]:args[0];
const host=typeof raw==='object'?raw.host:typeof args[1]==='string'?args[1]:undefined;
const socketPath=typeof raw==='object'?raw.path:typeof raw==='string'&&raw.startsWith('/')?raw:undefined;
if(!socketPath&&!['localhost','127.0.0.1','::1'].includes(host||'localhost'))forbidden();
return original.apply(this,args);};
// Mock only the Redis transport; run the real SDK, environment resolver and maintenance guards.
const originalFetch=global.fetch;
global.fetch=async function(url,init){
if(String(url)==='https://maintenance-redis.example.test'){
 if(JSON.stringify(JSON.parse(init.body))!==JSON.stringify(['get','vpcs:production:maintenance:2026-11-08:reopened']))forbidden();
 const flag=require('node:fs').readFileSync(process.env.FIXTURE_FLAG,'utf8');
 return Response.json({result:Buffer.from(flag).toString('base64')});
}
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(String(url)).hostname))forbidden();
return originalFetch(url,init);
};
if(process.env.FIXTURE_CLOCK_OFFSET){const realNow=Date.now.bind(Date);Date.now=()=>realNow()+Number(process.env.FIXTURE_CLOCK_OFFSET);}`);
const baseEnv = {
  FIXTURE_NETWORK_VIOLATIONS: path.join(root,'network-violations.log'),
  PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: tmpdir(),
  NODE_OPTIONS: `--require=${guard}`, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_API_BASE_URL: '',
};
const actions = ['contactAgentPostForm', 'contactLenderPostForm', 'GetListedAgentsPostForm', 'GetListedLendersPostForm', 'KeepInTouchForm', 'contactPostForm', 'vaLoanGuideForm', 'homebuyerGuideForm', 'internshipFormSubmission'];
const pages = {
  'contact-agent': ['ContactAgents/ContactAgent', '<Form derivedStateCode="CO" onSubmit={contactAgentPostForm}/>', 'contactAgentPostForm'],
  'contact-lender': ['ContactLender/ContactLender', '<Form derivedStateCode="CO" onSubmit={contactLenderPostForm}/>', 'contactLenderPostForm'],
  contact: ['contactpage/ContactForm/ContactForm', '<Form/>'],
  newsletter: ['homepage/KeepInTouch/KeepInTouch', '<Form/>'],
  'va-guide': ['homepage/VaLoanGuideDownload', '<Form/>'],
  'homebuyer-guide': ['homepage/VeteranPCSWorksComp/HomebuyerGuideDownload', '<Form/>'],
  internship: ['Internship/internshipapplication/InternshipForm', '<Form/>'],
  dialog: ['redesign/LeadCaptureDialog', '<Form kind="va-guide" triggerLabel="Open guide"/>'],
};
async function put(dir, name, text) {
  const dest = path.join(dir, name); await mkdir(path.dirname(dest), { recursive: true }); await writeFile(dest, text);
}
async function fixture(name, key) {
  const dir = path.join(root, 'source'); await mkdir(dir, {recursive:true});
  await rm(path.join(dir,'.next'), {recursive:true,force:true});
  for (const part of ['components','lib','services','constants','types','utils']) {
    await cp(path.join(repo, part), path.join(dir, part), { recursive: true, filter: src => !src.includes('__tests__') });
  }
  for (const part of ['node_modules','public']) {
    await rm(path.join(dir,part),{force:true}); await symlink(path.join(repo, part), path.join(dir, part));
  }
  for (const name of ['tailwind.config.ts','app/globals.css','app/steph.css','content/_data/us-states.json','content/_registry/journey-paths.json']) {
    await mkdir(path.dirname(path.join(dir, name)), { recursive: true }); await cp(path.join(repo, name), path.join(dir, name));
  }
  const ts = JSON.parse(await readFile(path.join(repo, 'tsconfig.json'), 'utf8'));
  ts.include = ['next-env.d.ts','app/**/*.ts','app/**/*.tsx','.next/types/**/*.ts'];
  await put(dir, 'tsconfig.json', JSON.stringify(ts));
  await put(dir, 'package.json', JSON.stringify({ name: 'mock-maintenance-reopening', private: true }));
  await put(dir, 'next.config.mjs', `export default {outputFileTracingRoot:${JSON.stringify(root)},experimental:{cpus:2},generateBuildId:async()=>${JSON.stringify(name)}};`);
  await put(dir, 'postcss.config.js', 'module.exports={plugins:{tailwindcss:{},autoprefixer:{}}};');
  await put(dir, 'app/layout.tsx', `import './globals.css';import './steph.css';import {IntakeMaintenanceProvider} from '@/components/common/IntakeMaintenance';export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><IntakeMaintenanceProvider>{children}</IntakeMaintenanceProvider></body></html>}`);
  await put(dir, 'services/clientMediaAccountService.ts', 'export const clientMediaAccountService={fetchAccounts:async()=>[]};');
  await put(dir, 'components/Concierge/index.ts', 'export function useConcierge(){return {open:(...args:unknown[])=>{},close:()=>{}}}');
  await put(dir, 'lib/analytics/client.ts', 'export const formTrackingPayload=(...args:unknown[])=>({});export const captureAnalyticsEvent=(...args:unknown[])=>{};export const trackFormStarted=captureAnalyticsEvent,trackFormSubmitAttempted=captureAnalyticsEvent,trackFormSubmissionFailed=captureAnalyticsEvent,trackFormValidationFailed=captureAnalyticsEvent,trackCtaClicked=captureAnalyticsEvent;');
  await put(dir, 'services/salesForcePostFormsService.tsx', `'use server';
import {appendFile} from 'node:fs/promises';
import {maintenanceNotSent,type IntakeMaintenanceResult} from '@/lib/leads/intake-maintenance';
import {getIntakeMaintenanceStatus} from '@/lib/leads/intake-maintenance-server';
${actions.map(action => `export async function ${action}(...args:unknown[]):Promise<IntakeMaintenanceResult|{success?:boolean;message?:string;redirectUrl?:string;submissionId?:string}>{
if((await getIntakeMaintenanceStatus()).active)return maintenanceNotSent();
await appendFile(process.env.FIXTURE_LEDGER!,JSON.stringify({build:process.env.FIXTURE_BUILD,action:'${action}',args})+'\\n');
return {success:true,message:'Mock accepted',redirectUrl:'/fixture-success',submissionId:'synthetic'};}`).join('\n')}`);
  for (const [route, [component, jsx, action]] of Object.entries(pages)) {
    await put(dir, `app/${route}/page.tsx`, `'use client';import Form from '@/components/${component}';${action ? `import {${action}} from '@/services/salesForcePostFormsService';` : ''}export default function Page(){return ${jsx};}`);
  }
  for (const kind of ['agents','lenders']) {
    await mkdir(path.join(dir, `app/get-listed-${kind}`), { recursive: true });
    await cp(path.join(repo, `app/(site)/get-listed-${kind}/page.tsx`), path.join(dir, `app/get-listed-${kind}/page.tsx`));
  }
  await put(dir, 'app/fixture-success/page.tsx', "export default function Page(){return <p>Mock request accepted</p>}");
  await put(dir, 'app/thank-you/page.tsx', "export default function Page(){return <p>Mock request accepted</p>}");
  await put(dir, 'app/api/v1/intake-status/route.ts', await readFile(path.join(repo, 'app/api/v1/intake-status/route.ts'), 'utf8'));
  await put(dir, 'app/api/v1/intake-redis-check/route.ts', await readFile(path.join(repo, 'app/api/v1/intake-redis-check/route.ts'), 'utf8'));
  const log = createWriteStream(path.join(root, `${name}-build.log`));
  const child = spawn(process.execPath, [next, 'build', dir, '--webpack'], { cwd: dir, env: { ...baseEnv, NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: key }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child); child.stdout.pipe(log); child.stderr.pipe(log);
  await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Build ${name} failed: ${root}`)));});
  const output=path.join(root,name); await mkdir(output);
  for(const part of ['.next','next.config.mjs','package.json']) await cp(path.join(dir,part),path.join(output,part),{recursive:true});
  for(const part of ['node_modules','public']) await symlink(path.join(repo,part),path.join(output,part));
  return output;
}
async function start(dir) {
  const log = createWriteStream(path.join(root, `${path.basename(dir)}-server.log`));
  const child = spawn(process.execPath, [next,'start',dir,'--hostname','127.0.0.1','--port','0'], {
    cwd: dir, env: { ...baseEnv, INTAKE_REDIS_CHECK_TOKEN: 'synthetic-diagnostic-token-at-least-32-characters', LEAD_INTAKE_MAINTENANCE: 'scheduled', VERCEL_ENV: 'production', UPSTASH_REDIS_REST_KV_REST_API_URL: 'https://maintenance-redis.example.test', UPSTASH_REDIS_REST_KV_REST_API_TOKEN: 'synthetic-token', FIXTURE_FLAG: path.join(root,'reopening-flag'), FIXTURE_BUILD: path.basename(dir), FIXTURE_CLOCK_OFFSET: String(Date.parse('2026-11-08T10:00:00Z')-Date.now()), FIXTURE_LEDGER: path.join(root,'ledger.jsonl'), NEXT_PUBLIC_API_BASE_URL: '' }, stdio:['ignore','pipe','pipe'],
  });
  children.push(child); child.stdout.pipe(log); child.stderr.pipe(log);
  let output = '';
  return new Promise((resolve,reject)=>{
    child.on('error',reject);child.on('exit',code=>reject(new Error(`Fixture exited ${code}`)));
    child.stdout.on('data',chunk=>{output+=chunk;const port=output.match(/127\.0\.0\.1:(\d+)/)?.[1];if(port&&output.includes('Ready'))resolve(Number(port));});
  });
}
async function fill(page) {
  const form=page.locator('form').first();
  for(const select of await form.locator('select').all()) {
    const value=await select.evaluate(el=>Array.from(el.options).find(o=>o.value==='CO')?.value??Array.from(el.options).find(o=>o.value&&!o.disabled)?.value);
    if(value)await select.selectOption(value);
  }
  for(const input of await form.locator('input,textarea').all()) {
    const name=await input.getAttribute('name'),type=await input.getAttribute('type');
    if(!name||name==='company_website'||['hidden','radio','checkbox'].includes(type)||!await input.isVisible()||!await input.isEnabled())continue;
    let value='Example';if(/email/i.test(name)||type==='email')value='alex@example.test';else if(/phone|mobile/i.test(name)||type==='tel')value='7195550100';else if(name==='00N4x00000QPLQY')value='12/31/2099';else if(/zip/i.test(name))value='80903';else if(/nmls|licenseNumber/i.test(name)||type==='number')value='12345';
    await input.fill(value);
  }
  for(const toggle of await form.locator('button[aria-haspopup="listbox"]').all()){await toggle.click();await page.getByRole('option',{name:'CO',exact:true}).click();}
}
const values = page => page.locator('form').evaluate(el=>Array.from(el.querySelectorAll('input,textarea,select')).filter(x=>x.name&&x.type!=='hidden').map(x=>[x.name,x.value,x.checked??null]));
const ledger = async () => (await readFile(path.join(root,'ledger.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
try {
  console.log(`Evidence: ${root}`);
  // Synthetic test keys only; no production key is accessed or changed.
  const key=randomBytes(32).toString('base64');
  const a=await fixture('paused-build',key);
  const b=await fixture('reopened-compatible-build',key);
  const c=await fixture('reopened-new-key-build',randomBytes(32).toString('base64'));
  await writeFile(path.join(root,'ledger.jsonl'),'');
  await writeFile(path.join(root,'reopening-flag'),'closed');
  const ports=[await start(a),await start(b),await start(c)];
  for (const port of ports) {
    const endpoint = `http://127.0.0.1:${port}/api/v1/intake-redis-check`;
    assert.equal((await fetch(endpoint)).status, 401);
    const response = await fetch(endpoint, { headers: { authorization: 'Bearer synthetic-diagnostic-token-at-least-32-characters' } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json().then(({ elapsedMs, ...body }) => body), { ok: true, flag: 'closed', withinBudget: true, budgetMs: 1000 });
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(await readFile(path.join(root,'reopening-flag'),'utf8'), 'closed');
    assert.equal((await ledger()).length, 0);
  }
  const setFlag=value=>writeFile(path.join(root,'reopening-flag'),value);
  let target=ports[0], actionTarget;
  proxy=http.createServer((req,res)=>{
    const upstream=http.request({hostname:'127.0.0.1',port:req.headers['next-action']&&actionTarget? actionTarget:target,path:req.url,method:req.method,headers:req.headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
  });
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${proxy.address().port}`;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({acceptDownloads:true});
  const unexpectedBrowserRequests=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();unexpectedBrowserRequests.push(new URL(route.request().url()).origin);return route.abort();});
  const results=[];
  for(const routing of ['same-build','pinned-old-actions']) for(const width of [390,1440]) for(const route of [...Object.keys(pages),'get-listed-agents','get-listed-lenders']) {
    await setFlag('closed');target=ports[0];actionTarget=undefined;const page=await context.newPage();await page.setViewportSize({width,height:900});await page.goto(`${origin}/${route}`);
    if(route==='dialog')await page.getByRole('button',{name:'Open guide'}).click();
    const steps=[];
    for(let step=1;step<=(route.startsWith('get-listed')?4:1);step++){
      await fill(page);steps.push(await values(page));if(route.startsWith('get-listed')&&step<4){const previous=await page.locator('form').elementHandle();await page.locator('form').evaluate(el=>el.requestSubmit());await page.waitForFunction(el=>!el.isConnected,previous);}
    }
    const initial=await values(page), count=(await ledger()).length;
    await page.locator('form').evaluate(el=>el.requestSubmit());await page.getByRole('alert').filter({hasText:'Your request was not sent'}).waitFor();
    await setFlag('open');
    if(routing==='pinned-old-actions'){target=ports[1];actionTarget=ports[0];}
    for(const port of ports.slice(0,2)){const status=await fetch(`http://127.0.0.1:${port}/api/v1/intake-status`).then(r=>r.json());assert.equal(status.active,false);}
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.getByRole('status').filter({hasText:'Intake has reopened'}).waitFor();
    assert.deepEqual(await values(page),initial);assert.equal((await ledger()).length,count);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('status').filter({hasText:'Intake has reopened'}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,`${routing}-${route}-${width}-reopened.png`)});
    if(route.startsWith('get-listed')){
      for(let step=2;step>=0;step--){
        const previous=await page.locator('form').elementHandle();await page.getByRole('button',{name:'Back',exact:true}).click();await page.waitForFunction(el=>!el.isConnected,previous);
        assert.deepEqual(await values(page),steps[step]);
      }
      for(let step=0;step<3;step++){
        const previous=await page.locator('form').elementHandle();await page.locator('form').evaluate(el=>el.requestSubmit());await page.waitForFunction(el=>!el.isConnected,previous);
        assert.deepEqual(await values(page),steps[step+1]);
      }
    }
    const actionResponse=page.waitForResponse(response=>response.request().method()==='POST'&&Boolean(response.request().headers()['next-action']));
    await page.locator('form').evaluate(el=>el.requestSubmit());
    const acceptedResponse=await actionResponse; assert.equal(acceptedResponse.status(),200);
    assert.equal(acceptedResponse.headers()['x-nextjs-action-not-found'],undefined);
    await page.waitForFunction(()=>location.pathname==='/fixture-success'||location.pathname==='/thank-you'||document.body.innerText.includes('Your guide is ready')||document.body.innerText.includes('Download Again')||document.body.innerText.includes('Thank you'));
    assert.equal((await ledger()).length,count+1);
    assert.equal((await ledger()).at(-1).build,'paused-build');
    results.push({route,width,routing,allStepDetailsRetained:true,acceptedOnExplicitRetry:true});await page.close();
  }
  // Probe the incompatible-action case separately; do not claim arbitrary builds are safe.
  await setFlag('closed');actionTarget=undefined;target=ports[0];const page=await context.newPage();await page.goto(`${origin}/contact-agent`);await fill(page);
  const initial=await values(page),count=(await ledger()).length;
  await page.locator('form').evaluate(el=>el.requestSubmit());await page.getByRole('alert').filter({hasText:'Your request was not sent'}).waitFor();
  await setFlag('open');target=ports[2];await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('status').filter({hasText:'Intake has reopened'}).waitFor();
  const rejected=page.waitForResponse(response=>response.request().method()==='POST'&&response.headers()['x-nextjs-action-not-found']==='1');
  await page.locator('form').evaluate(el=>el.requestSubmit());await rejected;
  assert.deepEqual(await values(page),initial);assert.equal((await ledger()).length,count);
  results.push({route:'contact-agent',incompatibleDeployment:true,detailsRetained:true,accepted:false,reason:'Old action ID rejected by new-key build'});
  await page.close();
  assert.deepEqual(unexpectedBrowserRequests,[],'Unexpected external browser requests');
  const violations=await readFile(baseEnv.FIXTURE_NETWORK_VIOLATIONS,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
  assert.equal(violations,'','Unexpected external server requests');
  await writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({sharedFlagCases:results.length-1,incompatibleActionRejected:true,evidence:root}));
} finally {
  await browser?.close();proxy?.close();
  for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');
}
