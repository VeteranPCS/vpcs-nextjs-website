import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const project = fileURLToPath(new URL('../..', import.meta.url));
function run(script: string, ...args: string[]) {
  return spawnSync(process.execPath, [`scripts/${script}`, ...args], {
    cwd: project,
    env: { PATH: process.env.PATH, NODE_ENV: 'test' },
    encoding: 'utf8',
    timeout: 5_000,
  });
}

describe('sandbox spam rehearsal command guards', () => {
  it('keeps an explicitly selected native phase plan-only without --execute', () => {
    const runPlan = run('verify-salesforce-spam-intake.mjs', '--phase', 'claim');
    expect(runPlan.status).toBe(0);
    expect(runPlan.stdout).toMatch(/plan only/i);
    expect(runPlan.stderr).toBe('');
  });

  it('rejects notification execution without the exact Lead ID shape before org authentication', () => {
    const unsafe = run('verify-salesforce-spam-intake.mjs', '--execute', '--phase', 'notify', '--lead-id', 'not-a-lead');
    expect(unsafe.status).toBe(1);
    expect(unsafe.stderr).toContain('--lead-id <operator fixture Lead ID>');
    expect(unsafe.stdout).toBe('');
  });

  it('blocks an eleven-case routing rehearsal from overusing two contact buckets', () => {
    const noThirdBucket = run('verify-salesforce-sandbox-leads.mjs', '--routing', '--execute',
      '--email', 'first@example.test', '--email', 'second@example.test');
    expect(noThirdBucket.status).toBe(1);
    expect(noThirdBucket.stderr).toContain('3 distinct approved email identities');
    expect(noThirdBucket.stdout).toBe('');
  });
});
