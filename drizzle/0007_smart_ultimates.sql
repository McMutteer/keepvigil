ALTER TABLE "executions" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "pipeline_mode" varchar(20);--> statement-breakpoint
CREATE INDEX "executions_installation_id_idx" ON "executions" USING btree ("installation_id");