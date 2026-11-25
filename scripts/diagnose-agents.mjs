#!/usr/bin/env node
// Diagnose why a given agent isn't rendering on a state page.
//
// For each {state, AccountId_15__c} pair, prints the record's gating fields
// (Active_on_Website__pc, State_s_Licensed_in__pc, Other_States__pc, area
// assignments, etc.) and re-runs the exact website SOQL the website fires
// for that state to confirm whether the agent passes the WHERE clause.
//
// Run:
//   node scripts/diagnose-agents.mjs <STATE:ID15> [<STATE:ID15> ...]
// Example:
//   node scripts/diagnose-agents.mjs OK:001Rg00000kYr7a FL:001Rg00000kvkAA

import { accountIdPattern, connectSandbox } from './lib/salesforce-sandbox.mjs';

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node scripts/diagnose-agents.mjs <STATE:ID15> [<STATE:ID15> ...]');
    console.error('Example: node scripts/diagnose-agents.mjs OK:001Rg00000kYr7a FL:001Rg00000kvkAA');
    process.exit(1);
}

const TARGETS = args.map((arg) => {
    const [state, id, extra] = arg.split(':');
    if (!/^[a-z]{2}$/i.test(state) || !accountIdPattern.test(id) || extra !== undefined) {
        console.error('Expected a two-letter state and an Account ID in STATE:ID format.');
        process.exit(1);
    }
    return { state: state.toUpperCase(), id15: id.slice(0, 15) };
});

const { query } = await connectSandbox();
console.log('✓ Authenticated\n');

console.log('═══ Per-agent record state ═══\n');
for (const t of TARGETS) {
    const soql = `
        SELECT Id, AccountId_15__c, Name, FirstName, LastName,
               isAgent__pc, Active_on_Website__pc,
               State_s_Licensed_in__pc, Other_States__pc,
               BillingState, BillingStateCode,
               (SELECT Id, Name, AA_Score__c, Area__r.Name, Area__r.State__c
                FROM Area_Assignments__r ORDER BY AA_Score__c DESC)
        FROM Account
        WHERE AccountId_15__c = '${t.id15}' OR Id = '${t.id15}'
    `.replace(/\s+/g, ' ').trim();

    const result = await query(soql);
    console.log(`── ${t.id15} (expected state=${t.state}) ──`);
    if (result.totalSize === 0) {
        console.log('  ✗ NOT FOUND in Salesforce by AccountId_15__c or Id');
        console.log();
        continue;
    }
    for (const rec of result.records) {
        console.log(`  Name:                    ${rec.Name}`);
        console.log(`  Id (18-char):            ${rec.Id}`);
        console.log(`  AccountId_15__c:         ${rec.AccountId_15__c}`);
        console.log(`  isAgent__pc:             ${rec.isAgent__pc}`);
        console.log(`  Active_on_Website__pc:   ${rec.Active_on_Website__pc}`);
        console.log(`  State_s_Licensed_in__pc: ${JSON.stringify(rec.State_s_Licensed_in__pc)}`);
        console.log(`  Other_States__pc:        ${JSON.stringify(rec.Other_States__pc)}`);
        console.log(`  BillingState:            ${rec.BillingState}`);
        console.log(`  BillingStateCode:        ${rec.BillingStateCode}`);
        const areas = rec.Area_Assignments__r?.records || [];
        console.log(`  Area_Assignments__r:     ${areas.length} record(s)`);
        for (const a of areas) {
            console.log(`     - ${a.Name} (Area: ${a.Area__r?.Name}, State: ${a.Area__r?.State__c}, Score: ${a.AA_Score__c})`);
        }
    }
    console.log();
}

console.log('═══ Re-running website query per state ═══\n');
const byState = TARGETS.reduce((acc, t) => {
    (acc[t.state] ||= []).push(t);
    return acc;
}, {});

for (const [state, agents] of Object.entries(byState)) {
    const soql = `
        SELECT Name, AccountId_15__c, FirstName, Agent_Bio__pc, Military_Status__pc,
               Military_Service__pc, Brokerage_Name__pc, BillingAddress,
               (SELECT Id, Name, AA_Score__c, Area__r.Name, Area__r.State__c
                FROM Area_Assignments__r ORDER BY AA_Score__c DESC)
        FROM Account
        WHERE isAgent__pc = true
          AND Active_on_Website__pc = true
          AND (State_s_Licensed_in__pc LIKE '%${state}%'
              OR Other_States__pc INCLUDES ('${state}'))
    `.replace(/\s+/g, ' ').trim();

    const result = await query(soql);
    const ids = new Set(result.records.map((r) => r.AccountId_15__c));
    console.log(`── State ${state}: ${result.totalSize} agent(s) returned by website query`);
    for (const t of agents) {
        const present = ids.has(t.id15);
        console.log(`   ${present ? '✓' : '✗'} ${t.id15} ${present ? 'is in result set' : 'NOT in result set'}`);
    }
    console.log();
}
