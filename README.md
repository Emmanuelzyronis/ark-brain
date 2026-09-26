# ArkBrain

**The semantic knowledge graph that answers why your team made every decision**

## Demo

> Interactive terminal demo — [view the full case study](https://emmanuelzyronis.vercel.app/work/ark-brain)

```text
$ curl -s -X POST http://localhost:3001/api/query \
  -d '{"question":"Why did we switch from REST to GraphQL?","workspace":"eng"}' | jq .

Searching workspace: GitHub PRs · Slack threads · Notion pages ...

{
  "answer": "The switch was driven by mobile performance requirements in Q3 2025. The iOS team was making 7-12 API calls per screen, causing visible lag on 4G. Decision made in RFC-041 after evaluating tRPC, GraphQL, and a custom batch endpoint. GraphQL won on team familiarity and schema-first contracts.",
  "sources": [
    { "type": "github_pr", "title": "RFC-041: API migration to GraphQL", "date": "2025-08-14" },
    { "type": "slack",     "channel": "#eng-arch",                       "date": "2025-08-10" },
    { "type": "notion",    "title": "ADR-019: GraphQL adoption rationale","date": "2025-08-15" }
  ],
  "confidence": "high",
  "source_count": 3
}
```

## Problem

Knowledge dies in Notion, Confluence, Slack, and engineer brains. New hires take 6+ months to reach full productivity. When a senior engineer leaves, their institutional knowledge is gone. Existing enterprise search (Glean, Notion AI) is string-matching over siloed documents — not semantic reasoning over connected decisions, architecture choices, and institutional history.

Glean charges $50K+/year, leaving every Series A/B startup completely underserved below $500/month.

## Market

$16.22B knowledge management software market (2026) growing at 18.34% CAGR to $37.64B by 2031. AI-driven KM sub-segment at 46.7% CAGR. YC Summer 2026 explicitly requested "Company Brain" as a top-priority area.

## Solution

Connect GitHub, Slack, Notion, and Confluence. Claude extracts entities, decisions, and rationale from every document and thread. pgvector builds a semantic knowledge graph. Ask "Why did we choose Postgres over MongoDB?" and get a sourced answer citing the Slack thread from 14 months ago.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Fastify v5 + TypeScript |
| Frontend | Next.js 15 App Router + TypeScript + Tailwind v4 |
| Database | Neon Postgres + pgvector |
| AI | Claude API (Anthropic) for entity/decision extraction + semantic Q&A |
| Auth | JWT (bcryptjs) |
| Monorepo | Turborepo |

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

# Copy and configure environment variables
cp .env.example apps/api/.env
# Edit apps/api/.env with your values

# Run database schema
cd apps/api && npx tsx src/db/run-schema.ts

# Start the backend (port 3001)
cd apps/api && npm run dev

# Start the frontend (port 3000)
cd apps/web && npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string (pooler URL) |
| `DATABASE_URL_DIRECT` | Neon Postgres direct connection |
| `JWT_SECRET` | 64+ char secret for JWT signing |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack OAuth app credentials |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app credentials |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` | Notion OAuth app credentials |

## Hackathon

**Agents for Humans Hackathon (AWS Strands SDK) — Professional Agents track**
https://agentsforhumans.devpost.com/

ArkBrain is a direct match for the Professional Agents track: an autonomous knowledge agent that eliminates 6+ months of new-hire onboarding overhead. The demo — connect a real GitHub repo and Slack workspace, ask an architectural question, receive a sourced answer in under 10 seconds — is reproducible and immediately convincing.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design.

### High-Level Flow

1. User connects GitHub/Slack/Notion via OAuth
2. Ingestion workers pull all PRs, issues, messages, and docs
3. Claude extracts entities (systems, vendors, concepts) and decisions (with rationale) from each document
4. Content chunked and embedded into pgvector
5. User asks a question in the chat interface
6. Semantic search retrieves relevant chunks across all sources
7. Claude synthesizes a multi-source answer with cited provenance links
8. Source citation panel shows exact excerpts from original documents

## Development

```bash
npm run dev        # Start all apps in parallel
npm run build      # Build all apps
npm run type-check # TypeScript type checking
```
