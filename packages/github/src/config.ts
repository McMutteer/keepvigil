/** Environment configuration for the GitHub App server */
export interface AppConfig {
  githubAppId: string;
  githubPrivateKey: string;
  githubWebhookSecret: string;
  redisUrl: string;
  databaseUrl: string;
  anthropicApiKey: string;
  port: number;
  nodeEnv: string;
}

/** Load and validate environment variables. Throws if required vars are missing. */
export function loadConfig(): AppConfig {
  const required = [
    "GITHUB_APP_ID",
    "GITHUB_APP_PRIVATE_KEY",
    "GITHUB_WEBHOOK_SECRET",
    "REDIS_URL",
    "DATABASE_URL",
    "ANTHROPIC_API_KEY",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    githubAppId: process.env.GITHUB_APP_ID!,
    githubPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
    redisUrl: process.env.REDIS_URL!,
    databaseUrl: process.env.DATABASE_URL!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    port: (() => {
      const rawPort = process.env.PORT ?? "3200";
      const parsed = Number.parseInt(rawPort, 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        throw new Error(`Invalid PORT: "${rawPort}" — must be an integer between 1 and 65535`);
      }
      return parsed;
    })(),
    nodeEnv: process.env.NODE_ENV ?? "development",
  };
}
