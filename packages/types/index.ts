// Shared TypeScript types for ArkBrain

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: string;
  settings: Record<string, unknown> | null;
  created_at: string;
  deleted_at: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'viewer';
  joined_at: string;
  user?: Pick<User, 'id' | 'email' | 'name' | 'avatar_url'>;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'viewer';
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_by: string;
}

export type ConnectorSource = 'slack' | 'notion' | 'github' | 'confluence' | 'gdrive';
export type ConnectorStatus = 'connecting' | 'active' | 'error' | 'disconnected';

export interface Connector {
  id: string;
  workspace_id: string;
  source: ConnectorSource;
  status: ConnectorStatus;
  scope: string | null;
  external_workspace_id: string | null;
  metadata: Record<string, unknown> | null;
  last_synced_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type SyncJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type SyncJobType = 'full' | 'incremental' | 'webhook';

export interface SyncJob {
  id: string;
  connector_id: string;
  workspace_id: string;
  status: SyncJobStatus;
  job_type: SyncJobType;
  documents_processed: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  workspace_id: string;
  connector_id: string;
  source: string;
  external_id: string;
  external_url: string | null;
  title: string | null;
  content: string | null;
  author_name: string | null;
  author_id: string | null;
  published_at: string | null;
  indexed_at: string | null;
  metadata: Record<string, unknown> | null;
}

export type EntityType = 'person' | 'system' | 'concept' | 'vendor' | 'protocol' | 'framework';

export interface Entity {
  id: string;
  workspace_id: string;
  name: string;
  entity_type: EntityType;
  description: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  mention_count: number;
  metadata: Record<string, unknown> | null;
}

export type DecisionType = 'architecture' | 'vendor' | 'process' | 'incident' | 'product' | 'security';

export interface Decision {
  id: string;
  workspace_id: string;
  title: string;
  rationale: string | null;
  outcome: string | null;
  decision_type: DecisionType;
  confidence_score: number | null;
  extracted_at: string;
  source_document_ids: string[];
  entity_ids: string[];
  metadata: Record<string, unknown> | null;
}

export interface DecisionSource {
  id: string;
  decision_id: string;
  document_id: string;
  excerpt: string | null;
  relevance_score: number | null;
  document?: Pick<Document, 'id' | 'title' | 'external_url' | 'source' | 'author_name' | 'published_at'>;
}

export interface ChatSession {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  workspace_id: string;
  role: 'user' | 'assistant';
  content: string;
  cited_document_ids: string[];
  cited_decision_ids: string[];
  latency_ms: number | null;
  token_count: number | null;
  created_at: string;
  citations?: MessageCitation[];
}

export interface MessageCitation {
  id: string;
  message_id: string;
  document_id: string;
  excerpt: string | null;
  relevance_score: number | null;
  citation_order: number;
  document?: Pick<Document, 'id' | 'title' | 'external_url' | 'source' | 'author_name' | 'published_at'>;
}

export interface OnboardingFAQ {
  id: string;
  workspace_id: string;
  question: string;
  answer: string;
  source_decision_ids: string[];
  source_document_ids: string[];
  generated_at: string;
  approved: boolean;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: Pick<User, 'id' | 'email' | 'name'>;
}

export interface GraphNode {
  id: string;
  type: 'entity' | 'decision';
  label: string;
  entity_type?: EntityType;
  decision_type?: DecisionType;
  mention_count?: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relationship_type: string;
  weight: number;
}

export interface WorkspaceStats {
  document_count: number;
  decision_count: number;
  entity_count: number;
  connector_count: number;
  last_sync_at: string | null;
}

// API Response types
export interface ApiError {
  error: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}
