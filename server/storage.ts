import { 
  users, organizations, agentConfigs, knowledgeItems, jobs, conversations, 
  webhookLogs, auditLogs, integrations, type User, type InsertUser,
  type Organization, type InsertOrganization, type AgentConfig, type InsertAgentConfig,
  type KnowledgeItem, type InsertKnowledgeItem, type Job, type InsertJob,
  type Conversation, type InsertConversation, type WebhookLog, type InsertWebhookLog,
  type AuditLog, type InsertAuditLog, type Integration, type InsertIntegration
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Organizations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  
  // Agent Configs
  getAgentConfigs(orgId: string): Promise<AgentConfig[]>;
  getAgentConfig(orgId: string, agentType: string): Promise<AgentConfig | undefined>;
  updateAgentConfig(agentType: string, data: Partial<InsertAgentConfig>): Promise<AgentConfig>;
  createAgentConfig(data: InsertAgentConfig): Promise<AgentConfig>;
  
  // Knowledge Items
  getKnowledgeItems(orgId: string): Promise<KnowledgeItem[]>;
  getKnowledgeItem(id: string): Promise<KnowledgeItem | undefined>;
  createKnowledgeItem(data: InsertKnowledgeItem): Promise<KnowledgeItem>;
  updateKnowledgeItem(id: string, data: Partial<InsertKnowledgeItem>): Promise<KnowledgeItem>;
  deleteKnowledgeItem(id: string): Promise<void>;
  
  // Jobs
  getJobs(orgId: string): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(data: InsertJob): Promise<Job>;
  updateJob(id: string, data: Partial<InsertJob>): Promise<Job>;
  
  // Conversations
  getConversations(orgId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation>;
  
  // Webhook Logs
  getWebhookLogs(orgId: string, source?: string, limit?: number): Promise<WebhookLog[]>;
  createWebhookLog(data: InsertWebhookLog): Promise<WebhookLog>;
  
  // Audit Logs
  getAuditLogs(orgId: string): Promise<AuditLog[]>;
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  
  // Integrations
  getIntegrations(orgId: string): Promise<Integration[]>;
  createIntegration(data: InsertIntegration): Promise<Integration>;
  updateIntegration(orgId: string, data: Partial<InsertIntegration>): Promise<Integration>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(insertOrg)
      .returning();
    return org;
  }

  async getAgentConfigs(orgId: string): Promise<AgentConfig[]> {
    return await db.select()
      .from(agentConfigs)
      .where(eq(agentConfigs.orgId, orgId))
      .orderBy(desc(agentConfigs.createdAt));
  }

  async getAgentConfig(orgId: string, agentType: string): Promise<AgentConfig | undefined> {
    const [config] = await db.select()
      .from(agentConfigs)
      .where(and(
        eq(agentConfigs.orgId, orgId),
        eq(agentConfigs.agentType, agentType as any)
      ));
    return config || undefined;
  }

  async updateAgentConfig(agentType: string, data: Partial<InsertAgentConfig>): Promise<AgentConfig> {
    const [config] = await db
      .update(agentConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentConfigs.agentType, agentType as any))
      .returning();
    return config;
  }

  async createAgentConfig(data: InsertAgentConfig): Promise<AgentConfig> {
    const [config] = await db
      .insert(agentConfigs)
      .values(data)
      .returning();
    return config;
  }

  async getKnowledgeItems(orgId: string): Promise<KnowledgeItem[]> {
    return await db.select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.orgId, orgId))
      .orderBy(desc(knowledgeItems.createdAt));
  }

  async getKnowledgeItem(id: string): Promise<KnowledgeItem | undefined> {
    const [item] = await db.select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.id, id));
    return item || undefined;
  }

  async createKnowledgeItem(data: InsertKnowledgeItem): Promise<KnowledgeItem> {
    const [item] = await db
      .insert(knowledgeItems)
      .values(data)
      .returning();
    return item;
  }

  async updateKnowledgeItem(id: string, data: Partial<InsertKnowledgeItem>): Promise<KnowledgeItem> {
    const [item] = await db
      .update(knowledgeItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeItems.id, id))
      .returning();
    return item;
  }

  async deleteKnowledgeItem(id: string): Promise<void> {
    await db.delete(knowledgeItems).where(eq(knowledgeItems.id, id));
  }

  async getJobs(orgId: string): Promise<Job[]> {
    return await db.select()
      .from(jobs)
      .where(eq(jobs.orgId, orgId))
      .orderBy(desc(jobs.createdAt));
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select()
      .from(jobs)
      .where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(data: InsertJob): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values(data)
      .returning();
    return job;
  }

  async updateJob(id: string, data: Partial<InsertJob>): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async getConversations(orgId: string): Promise<Conversation[]> {
    return await db.select()
      .from(conversations)
      .where(eq(conversations.orgId, orgId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(data)
      .returning();
    return conversation;
  }

  async updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation> {
    const [conversation] = await db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async getWebhookLogs(orgId: string, source?: string, limit = 50): Promise<WebhookLog[]> {
    const conditions = [eq(webhookLogs.orgId, orgId)];
    
    if (source) {
      conditions.push(eq(webhookLogs.source, source));
    }

    return await db.select()
      .from(webhookLogs)
      .where(and(...conditions))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  async createWebhookLog(data: InsertWebhookLog): Promise<WebhookLog> {
    const [log] = await db
      .insert(webhookLogs)
      .values(data)
      .returning();
    return log;
  }

  async getAuditLogs(orgId: string): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values(data)
      .returning();
    return log;
  }

  async getIntegrations(orgId: string): Promise<Integration[]> {
    return await db.select()
      .from(integrations)
      .where(eq(integrations.orgId, orgId));
  }

  async createIntegration(data: InsertIntegration): Promise<Integration> {
    const [integration] = await db
      .insert(integrations)
      .values(data)
      .returning();
    return integration;
  }

  async updateIntegration(orgId: string, data: Partial<InsertIntegration>): Promise<Integration> {
    const [integration] = await db
      .update(integrations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(integrations.orgId, orgId))
      .returning();
    return integration;
  }
}

export const storage = new DatabaseStorage();
