#!/usr/bin/env node
// Website OAuth intentionally has no Account edit permission in WebDev.
// Keep the legacy entrypoint closed; the operator fixture workflow creates
// active synthetic partners through the separately verified sandbox CLI.
console.error(
    'This legacy activation command is retired. Follow salesforce/fixtures/README.md '
    + 'to seed or reconcile active synthetic partners with the vpcs-webdev operator. '
    + 'Do not grant Account Edit to either website OAuth user.',
);
process.exitCode = 1;
