# Scalability & Deployment Notes

This project is built as a **modular monolith**: one deployable today, but organized so it
can scale out — both in engineering throughput (adding features) and in runtime capacity
(handling load) — without a rewrite.

## 1. Scalable code structure
Each feature lives in a self-contained module under `src/modules/<feature>/`:

```
model → validation → service → controller → routes
```

- **Controllers** stay thin (HTTP in/out); **services** hold business logic and are framework-agnostic, so they’re unit-testable and reusable.
- Adding a new entity (e.g. `products`, `notes`) = copy a module folder + register one line in `routes/v1/index.js`. No edits to existing modules → low merge-conflict risk across a team.
- API is **versioned** (`/api/v1`), so breaking changes ship as `/api/v2` while v1 keeps serving old clients.

## 2. Stateless app → horizontal scaling
- The API holds **no in-process session state** — auth is via stateless JWTs. Any instance can serve any request, so we can run **N replicas behind a load balancer** (NGINX, AWS ALB, etc.) and scale horizontally.
- `trust proxy` is enabled so rate-limiting and client-IP logic work correctly behind a proxy/LB.
- **Graceful shutdown** (SIGTERM/SIGINT drain) makes it safe for rolling deploys and autoscaling on Kubernetes / ECS.

## 3. Caching (Redis)
- **Read-through cache** for hot, read-heavy endpoints (e.g. task lists, user lookups) with short TTLs and cache-busting on writes.
- **Centralized rate limiting / refresh-token store**: move the rate-limiter and refresh-token denylist to Redis so limits and revocations are **shared across all instances** (today they’re per-process / in the user doc, which is correct for a single node).
- **Sessions/queues**: Redis also backs job queues (BullMQ) for async work (emails, webhooks) so request latency stays low.

## 4. Database scaling
- **Indexes** already cover the hot paths: unique `email`, `role`, `task.owner`, and a compound `{ owner, status, createdAt }` for the default task query. Add indexes as query patterns emerge; watch the slow-query log.
- **Pagination everywhere** (`page`/`limit`, capped) prevents unbounded result sets. For very large collections, switch to **cursor/keyset pagination**.
- **Connection pooling** is configured (`maxPoolSize`). 
- Scale the data tier with a **MongoDB replica set** (HA + read replicas for read scaling) and **sharding** on a high-cardinality key (e.g. `owner`) when a single primary is saturated.

## 5. Toward microservices (when/if needed)
The module boundaries map cleanly to future services:
- **Auth/Identity service** (users, tokens, RBAC)
- **Tasks service** (domain CRUD)
- An **API gateway** handles routing, auth verification, and rate limiting; services communicate via REST/gRPC or an event bus (Kafka/RabbitMQ) for async, decoupled workflows.

Don’t split prematurely — the monolith is cheaper to operate until a clear scaling or team-ownership boundary justifies the operational cost.

## 6. Security hardening for production
- Move refresh tokens to **httpOnly, Secure, SameSite cookies** (the API already supports `credentials`) to remove them from JS-reachable storage and mitigate XSS token theft.
- Enforce **HTTPS/TLS** termination at the LB; set HSTS (Helmet).
- Manage secrets via a vault / platform secret store (never commit `.env`).
- Add account lockout / exponential backoff on repeated auth failures (Redis-backed).

## 7. Observability & ops
- **Structured JSON logs** (winston) in production → ship to ELK / Loki / Datadog.
- Add **request IDs** and metrics (Prometheus `/metrics`) for latency, error rate, throughput (the “RED” method).
- `/health` endpoint already exposed for **load-balancer health checks** and orchestrator liveness/readiness probes.

## 8. Deployment options
- **Single VM / PaaS** (Render, Railway, Fly.io, Heroku): run `npm start`, point `MONGODB_URI` at MongoDB Atlas, set JWT secrets as env vars. Frontend builds to static assets (`npm run build`) servable from any CDN/static host (Vercel, Netlify, S3+CloudFront).
- **Containers / Kubernetes**: package the API in a container, run multiple replicas behind a Service + Ingress with an HPA (horizontal pod autoscaler), Redis + MongoDB as managed/stateful dependencies.
- **CI/CD**: lint + tests on PR, build artifacts, deploy on merge with rolling updates and the graceful-shutdown handling already in place.
