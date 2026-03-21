import { z } from "zod";

const AppConfigSchema = z.object({
  githubAppId:         z.string().min(1, "GITHUB_APP_ID is required"),
  githubPrivateKey:    z.string().min(1, "GITHUB_APP_PRIVATE_KEY is required"),
  githubWebhookSecret: z.string().min(1, "GITHUB_WEBHOOK_SECRET is required"),
  redisUrl:            z.string().url("REDIS_URL must be a valid URL"),
  databaseUrl:         z.string().url("DATABASE_URL must be a valid URL"),
  openaiApiKey:        z.string().default(""),
  groqApiKey:          z.string().default(""),
  groqModel:           z.string().default("openai/gpt-oss-120b"),
  githubClientId:        z.string().default(""),
  githubClientSecret:    z.string().default(""),
  sessionSecret:         z.string().default(""),
  stripeGatewayUrl:      z.string().default(""),
  stripeGatewayApiKey:   z.string().default(""),
  stripeForwardingSecret: z.string().default(""),
  stripeProPriceId:      z.string().default(""),
  stripeTeamPriceId:     z.string().default(""),
  oauthRedirectUri:      z.string().default(""),
  port:                z.coerce.number().int().min(1).max(65535).default(3200),
  nodeEnv:             z.string().default("development"),
}).superRefine((data, ctx) => {
  // OAuth config must be all-or-nothing
  const oauthFields = [data.githubClientId, data.githubClientSecret, data.sessionSecret];
  const populated = oauthFields.filter(Boolean).length;
  if (populated > 0 && populated < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "OAuth requires all three: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET",
      path: ["githubClientId"],
    });
  }
  // At least one LLM provider must be configured
  if (!data.openaiApiKey && !data.groqApiKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one LLM provider is required: OPENAI_API_KEY or GROQ_API_KEY",
      path: ["openaiApiKey"],
    });
  }
  // SESSION_SECRET must be at least 32 characters when set
  if (data.sessionSecret && data.sessionSecret.length < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "SESSION_SECRET must be at least 32 characters for HS256 security",
      path: ["sessionSecret"],
    });
  }
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
    openaiApiKey:        process.env.OPENAI_API_KEY,
    groqApiKey:          process.env.GROQ_API_KEY,
    groqModel:           process.env.GROQ_MODEL,
    githubClientId:         process.env.GITHUB_CLIENT_ID,
    githubClientSecret:     process.env.GITHUB_CLIENT_SECRET,
    sessionSecret:          process.env.SESSION_SECRET,
    stripeGatewayUrl:       process.env.STRIPE_GATEWAY_URL,
    stripeGatewayApiKey:    process.env.STRIPE_GATEWAY_API_KEY,
    stripeForwardingSecret: process.env.STRIPE_FORWARDING_SECRET,
    stripeProPriceId:       process.env.STRIPE_PRO_PRICE_ID,
    stripeTeamPriceId:      process.env.STRIPE_TEAM_PRICE_ID,
    oauthRedirectUri:       process.env.OAUTH_REDIRECT_URI,
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
