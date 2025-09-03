import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "operator", "viewer"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "completed", "failed", "cancelled"]);
export const agentTypeEnum = pgEnum("agent_type", ["qualifier", "closer", "scheduler", "objections", "pooling", "followups"]);
export const knowledgeStatusEnum = pgEnum("knowledge_status", ["queued", "embedding", "ready", "failed"]);
export const sourceTypeEnum = pgEnum("source_type", ["pdf", "csv", "md", "url", "text"]);

// Organizations
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull().default("America/Argentina/Buenos_Aires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  roles: userRoleEnum("roles").array().notNull().default(sql`ARRAY['viewer']::user_role[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Integrations
export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  chatwoot: json("chatwoot"),
  heyreach: json("heyreach"),
  n8n: json("n8n"),
  idp: json("idp"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agent Configurations
export const agentConfigs = pgTable("agent_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  agentType: agentTypeEnum("agent_type").notNull(),
  system: text("system").notNull(),
  outputSchema: json("output_schema"),
  paramsJson: json("params_json"),
  version: text("version").notNull().default("1.0.0"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Knowledge Items
export const knowledgeItems = pgTable("knowledge_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  url: text("url"),
  status: knowledgeStatusEnum("status").notNull().default("queued"),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  bytes: integer("bytes"),
  lang: text("lang").default("es"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// LinkedIn Jobs (existing table reference)
export const linkedinJobs = pgTable("linkedin_jobs_incubadora", {
  id: varchar("id").primaryKey(),
  status: text("status"),
  data: json("data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Webhook Logs
export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  source: text("source").notNull(),
  eventId: text("event_id"),
  status: text("status").notNull(),
  payloadJson: json("payload_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  actorUserId: varchar("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  target: text("target").notNull(),
  beforeJson: json("before_json"),
  afterJson: json("after_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Jobs
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  type: text("type").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  priority: integer("priority").default(0),
  data: json("data"),
  result: json("result"),
  error: text("error"),
  agentType: agentTypeEnum("agent_type"),
  chatwootConversationId: text("chatwoot_conversation_id"),
  hrChatroomId: text("hr_chatroom_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Conversations
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  senderAccountId: text("sender_account_id"),
  campaign: text("campaign"),
  aiEnabled: boolean("ai_enabled").default(true),
  aiMutedUntil: timestamp("ai_muted_until"),
  chatwootConversationId: text("chatwoot_conversation_id"),
  chatwootContactId: text("chatwoot_contact_id"),
  hrChatroomId: text("hr_chatroom_id"),
  lastInteraction: timestamp("last_interaction"),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  integrations: many(integrations),
  agentConfigs: many(agentConfigs),
  knowledgeItems: many(knowledgeItems),
  webhookLogs: many(webhookLogs),
  auditLogs: many(auditLogs),
  jobs: many(jobs),
  conversations: many(conversations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  agentConfigs: many(agentConfigs),
  auditLogs: many(auditLogs),
}));

export const agentConfigsRelations = relations(agentConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [agentConfigs.orgId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [agentConfigs.createdBy],
    references: [users.id],
  }),
}));

export const knowledgeItemsRelations = relations(knowledgeItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [knowledgeItems.orgId],
    references: [organizations.id],
  }),
}));

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [webhookLogs.orgId],
    references: [organizations.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.orgId],
    references: [organizations.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [jobs.orgId],
    references: [organizations.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  organization: one(organizations, {
    fields: [conversations.orgId],
    references: [organizations.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.orgId],
    references: [organizations.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentConfigSchema = createInsertSchema(agentConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgeItemSchema = createInsertSchema(knowledgeItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AgentConfig = typeof agentConfigs.$inferSelect;
export type InsertAgentConfig = z.infer<typeof insertAgentConfigSchema>;
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type InsertKnowledgeItem = z.infer<typeof insertKnowledgeItemSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type LinkedinJob = typeof linkedinJobs.$inferSelect;
