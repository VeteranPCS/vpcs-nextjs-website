const initialEnv = { ...process.env };

function loadEnvConfig() {
    return { combinedEnv: process.env, parsedEnv: {}, loadedEnvFiles: [] };
}

function updateInitialEnv(values) {
    Object.assign(initialEnv, values);
}

module.exports = { initialEnv, loadEnvConfig, updateInitialEnv };
