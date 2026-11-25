// Next's parent and workers receive a validated environment snapshot from the
// launcher. Stop Next from reloading dotenv files in those child processes.
const { registerHooks } = require('node:module');
const { pathToFileURL } = require('node:url');

if (process.env.VPCS_SALESFORCE_PROFILE === 'mock') require('./mock-network-preload.cjs');

const nextEnvSnapshot = pathToFileURL(require.resolve('./next-environment-snapshot.cjs')).href;
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === '@next/env') return { shortCircuit: true, url: nextEnvSnapshot };
        return nextResolve(specifier, context);
    },
});
