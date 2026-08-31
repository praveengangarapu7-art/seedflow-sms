import 'dotenv/config';

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

const DEV_JWT_SECRET_FALLBACK = 'dev-access-secret-change-me';
const nodeEnv = optional('NODE_ENV', 'development');

// The fallback below is convenient for a fresh local clone, but a
// well-known, hardcoded JWT secret would let anyone forge a valid access
// token for any user/role — never acceptable outside development. Fail
// loudly at startup rather than silently signing tokens with it.
if (nodeEnv === 'production' && (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET === DEV_JWT_SECRET_FALLBACK)) {
  throw new Error('JWT_ACCESS_SECRET must be set to a real secret in production — refusing to start with the development default.');
}

export const env = {
  port: Number(optional('PORT', '5000')),
  databaseUrl: optional('DATABASE_URL', 'postgresql://seedflow:seedflow@localhost:5433/seedflow'),
  nodeEnv,
  jwtAccessSecret: optional('JWT_ACCESS_SECRET', DEV_JWT_SECRET_FALLBACK),
  accessTokenTtl: optional('ACCESS_TOKEN_TTL', '15m'),
  refreshTokenTtlDays: Number(optional('REFRESH_TOKEN_TTL_DAYS', '7')),
  frontendOrigin: optional('FRONTEND_ORIGIN', 'http://localhost:5173'),

  // AI assistant (optional). When aiApiKey is empty the assistant still works
  // — it answers from the deterministic intent engine over real DB data
  // instead of calling an external model. Nothing here is required to boot.
  aiProvider: optional('AI_PROVIDER', 'anthropic'),
  aiApiKey: optional('AI_API_KEY', ''),
  aiModel: optional('AI_MODEL', ''),
  // Hard ceiling on how many rows of real data are packed into a prompt, so
  // a large database can never blow up the context window or the bill.
  aiMaxContextRows: Number(optional('AI_MAX_CONTEXT_ROWS', '40')),
};
