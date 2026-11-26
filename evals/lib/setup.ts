import { config } from 'dotenv';

// Load only the dedicated evaluation credential, leaving site credentials out of the eval process.
const { parsed } = config({ path: '.env.evals.local', processEnv: {} });
const evaluationKey = (process.env.VPCS_EVAL_AI_GATEWAY_API_KEY ?? parsed?.VPCS_EVAL_AI_GATEWAY_API_KEY)?.trim();

if (!evaluationKey) {
  throw new Error(
    'Evals require VPCS_EVAL_AI_GATEWAY_API_KEY from a dedicated evaluation project. Set it in .env.evals.local or the shell.',
  );
}
process.env.AI_GATEWAY_API_KEY = evaluationKey;
delete process.env.VERCEL_OIDC_TOKEN;
