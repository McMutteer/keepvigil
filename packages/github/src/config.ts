import { z } from "zod";

const AppConfigSchema = z.object({
  githubAppId:         z.string().min(1, "GITHUB_APP_ID is required"),
  githubPrivateKey:    z.string().min(1, "GITHUB_APP_PRIVATE_KEY is required"),
  githubWebhookSecret: z.string().min(1, "GITHUB_WEBHOOK_SECRET is required"),
  redisUrl:            z.string().url("REDIS_URL must be a valid URL"),
  databaseUrl:         z.string().url("DATABASE_URL must be a valid URL"),
  groqApiKey:          z.string().min(1, "GROQ_API_KEY is required"),
  port:                z.coerce.number().int().min(1).max(65535).default(3200),
  nodeEnv:             z.string().default("development"),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/** Load and validate environment variables. Throws with all issues listed if any are missing or invalid. */
export function loadConfig(): AppConfig {
  const result = AppConfigSchema.safeParse({
    githubAppId:         process.env.GITHUB_APP_ID,
    githubPrivateKey:    process.env.GITHUB_APP_PRIVATE_KEY,
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    redisUrl:            process.env.REDIS_URL,
    databaseUrl:         process.env.DATABASE_URL,
    groqApiKey:          process.env.GROQ_API_KEY,
    port:                process.env.PORT,
    nodeEnv:             process.env.NODE_ENV,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuration error — fix these before starting Vigil:\n${issues}`);
  }

  return result.data;
}
