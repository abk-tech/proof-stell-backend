import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtIssuer: process.env.JWT_ISSUER || 'proof-stell-backend',
  jwtAudience: process.env.JWT_AUDIENCE || 'proof-stell-client',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  leaderboardRecalculationStrategy:
    process.env.LEADERBOARD_RECALCULATION_STRATEGY || 'batch',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  authMaxFailedAttempts: parseInt(
    process.env.AUTH_MAX_FAILED_ATTEMPTS || '5',
    10,
  ),
  authLockoutDurationSeconds: parseInt(
    process.env.AUTH_LOCKOUT_DURATION_SECONDS || '900',
    10,
  ),
  authAttemptWindowSeconds: parseInt(
    process.env.AUTH_ATTEMPT_WINDOW_SECONDS || '900',
    10,
  ),
  starknetPrivateKey: process.env.STARKNET_PRIVATE_KEY,
  starknetAccountAddress: process.env.STARKNET_ACCOUNT_ADDRESS,
  mintContractAddress: process.env.MINT_CONTRACT_ADDRESS,
  // Add more config values as needed
}));
