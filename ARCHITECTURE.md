# ArkBrain Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SOURCES                            │
│   Slack API    GitHub API    Notion API    Confluence    GDrive      │
└────────┬──────────┬──────────────┬─────────────┬────────────┬───────┘
         │          │              │             │            │
         ▼          ▼              ▼             ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FASTIFY INGESTION WORKERS                        │
│   OAuth handlers  │  Incremental sync  │  Webhook receivers         │
│   /api/oauth/*    │  sync jobs table   │  /api/webhooks/*           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       AI EXTRACTION LAYER                           │
│   Claude API ──► Entity extraction (people, systems, concepts)      │
│                ──► Decision extraction (title, rationale, type)     │
│                ──► Chunk embedding via pgvector                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEON POSTGRES + pgvector                        │
│   users / workspaces / workspace_members                            │
│   connectors / sync_jobs / documents / chunks(vector)               │
│   entities / entity_relationships                                   │
│   decisions / decision_sources                                      │
│   chat_sessions / chat_messages / message_citations                 │
│   onboarding_faqs / audit_logs                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
┌───────────────────────┐   ┌───────────────────────────────────────┐
│    FASTIFY REST API   │   │         NEXT.JS 15 FRONTEND            │
│   /api/auth/*         │   │   / — Landing page                    │
│   /api/workspaces/*   │◄──│   /login, /register                  │
│   /api/chat/*         │   │   /dashboard — KPI tiles + feed       │
│   /api/decisions/*    │   │   /chat — Streaming Q&A interface     │
│   /api/entities/*     │   │   /timeline — Decision timeline       │
│   /api/graph          │   │   /connectors — OAuth management      │
│   /api/health         │   │   /graph — Knowledge graph explorer   │
└───────────────────────┘   └───────────────────────────────────────┘
```

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| email | text UNIQUE NOT NULL | |
| name | text | |
| password_hash | text | bcrypt |
| avatar_url | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### workspaces
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text NOT NULL | |
| slug | text UNIQUE NOT NULL | |
| owner_id | uuid FK users | |
| plan | text DEFAULT 'free' | |
| settings | jsonb | |
| created_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

### workspace_members
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK workspaces | |
| user_id | uuid FK users | |
| role | text | 'admin' or 'viewer' |
| joined_at | timestamptz | |

### connectors
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK workspaces | |
| source | text | slack/notion/github/confluence/gdrive |
| status | text | connecting/active/error/disconnected |
| access_token | text | encrypted |
| refresh_token | text | encrypted |
| scope | text | |
| external_workspace_id | text | |
| metadata | jsonb | |
| last_synced_at | timestamptz | |

### documents
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK workspaces | |
| connector_id | uuid FK connectors | |
| source | text | |
| external_id | text | source-unique ID |
| external_url | text | link to original |
| title | text | |
| content | text | full text |
| author_name | text | |
| published_at | timestamptz | |
| indexed_at | timestamptz | |

### chunks
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| document_id | uuid FK documents | |
| workspace_id | uuid FK workspaces | |
| content | text NOT NULL | |
| chunk_index | int | order within document |
| embedding | vector(1536) | pgvector |

### decisions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK workspaces | |
| title | text NOT NULL | |
| rationale | text | extracted verbatim |
| outcome | text | |
| decision_type | text | architecture/vendor/process/incident/product/security |
| confidence_score | float | 0-1 |
| extracted_at | timestamptz | |
| source_document_ids | uuid[] | |
| entity_ids | uuid[] | |

### entities
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK workspaces | |
| name | text NOT NULL | |
| entity_type | text | person/system/concept/vendor/protocol/framework |
| description | text | |
| mention_count | int DEFAULT 0 | |

### chat_sessions / chat_messages
Standard conversation history with citation tracking per message.

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Authenticate, return JWT |
| POST | /api/auth/logout | Invalidate session |
| GET | /api/auth/me | Current user profile |

### Workspaces
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/workspaces | Create workspace |
| GET | /api/workspaces/:id | Workspace details |
| PATCH | /api/workspaces/:id | Update workspace |
| GET | /api/workspaces/:id/members | List members |
| POST | /api/workspaces/:id/invites | Send invite |
| GET | /api/workspaces/:id/stats | Stats summary |

### Connectors
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/oauth/:source/authorize | OAuth redirect |
| GET | /api/oauth/:source/callback | OAuth callback |
| GET | /api/workspaces/:id/connectors | List connectors |
| POST | /api/workspaces/:id/connectors/:source/sync | Trigger sync |
| DELETE | /api/workspaces/:id/connectors/:source | Disconnect |

### Knowledge
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/workspaces/:id/decisions | Decision timeline |
| GET | /api/workspaces/:id/decisions/:decisionId | Decision detail |
| GET | /api/workspaces/:id/entities | Entity list |
| GET | /api/workspaces/:id/graph | Graph nodes + edges |
| GET | /api/workspaces/:id/documents | Document list |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/workspaces/:id/chat/sessions | New session |
| GET | /api/workspaces/:id/chat/sessions | List sessions |
| GET | /api/workspaces/:id/chat/sessions/:sessionId | Session history |
| POST | /api/workspaces/:id/chat/sessions/:sessionId/messages | Ask question (streaming) |
| DELETE | /api/workspaces/:id/chat/sessions/:sessionId | Delete session |

### Misc
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/workspaces/:id/onboarding/faq | Generate FAQ |
| GET | /api/workspaces/:id/onboarding/faq | Get FAQ |
| GET | /api/workspaces/:id/audit | Audit log |
| GET | /api/health | Health check |

## Frontend Route Map

| Route | Page |
|-------|------|
| / | Marketing landing page |
| /login | Sign in form |
| /register | Account creation |
| /dashboard | Overview: connector health, recent decisions, quick-ask |
| /chat | Full-screen chat with session sidebar |
| /chat/:sessionId | Restored chat session |
| /timeline | Knowledge timeline with decision cards |
| /timeline/:decisionId | Decision detail |
| /connectors | Connector management grid |
| /connectors/:source/setup | OAuth connection flow |
| /graph | Interactive knowledge graph explorer |
| /onboarding-faq | Generated FAQ document |
| /team | Member list + invite form |
| /audit | Audit log table |
| /settings | Workspace settings |
| /account | Personal profile |
