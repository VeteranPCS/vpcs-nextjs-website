#!/usr/bin/env node
import { connectSandbox } from './lib/salesforce-sandbox.mjs';

try {
    const { config, fingerprint } = await connectSandbox();
    console.log(`Verified Salesforce ${config.profile} sandbox at ${config.restOrigin} (${fingerprint.slice(0, 12)}).`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
