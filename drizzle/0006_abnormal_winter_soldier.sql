CREATE TYPE "public"."rule_type_enum" AS ENUM('ignore', 'convention');--> statement-breakpoint
ALTER TABLE "repo_rules" ALTER COLUMN "rule_type" SET DEFAULT 'ignore'::"public"."rule_type_enum";--> statement-breakpoint
ALTER TABLE "repo_rules" ALTER COLUMN "rule_type" SET DATA TYPE "public"."rule_type_enum" USING "rule_type"::"public"."rule_type_enum";