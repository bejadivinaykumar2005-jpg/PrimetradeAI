# Primetrade.ai — Scalable REST API with Auth, RBAC & Task CRUD

A production-style **REST API** (Node.js + Express + MongoDB) with **JWT authentication**, **role-based access control**, and full **CRUD for a Task entity**, plus a **React + Vite** frontend to register/login, view a protected dashboard, and manage tasks.

> Built for the Primetrade.ai Backend Developer Intern assignment.

---

## ✨ Features

### Backend (primary focus)
- **Auth APIs** — register, login, refresh, logout, current-user (`/me`)
- **Password hashing** with bcrypt (12 salt rounds)
- **JWT** access tokens (short-lived) + **rotating refresh tokens** (revocable, stored hashed)
- **Role-based access** — `user` vs `admin`; admin-only user-management endpoints
- **CRUD for Tasks** — ownership-scoped (users see their own; admins see all), with filtering, search, sorting & pagination
- **API versioning** — everything under `/api/v1`
- **Validation** with Zod (body / query / params) + centralized error handling
- **Security** — Helmet, CORS allow-list, rate limiting, NoSQL-injection sanitization, HPP protection
- **API docs** — Swagger UI at `/api/docs` + a ready-to-import **Postman collection**
- **Logging** (winston + morgan), health check, graceful shutdown
- **Modular, scalable structure** — add a new feature by dropping in a `module/` folder

### Frontend (supportive)
- React 18 + Vite + React Router
- Register / login, JWT stored client-side, **auto token refresh** via an Axios interceptor
- **Protected dashboard** (redirects to login if unauthenticated)
- Full **task CRUD** UI — create/edit modal, quick status change, search, status filters, pagination
- **Admin Users** page (role/status management) — only visible to admins
- Toast notifications surfacing **success/error messages straight from the API**

---

## 🧱 Tech Stack

| Layer     | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| Runtime   | Node.js 18+ (ES Modules)                                      |
| Framework | Express 4                                                     |
| Database  | MongoDB + Mongoose                                            |
| Auth      | JSON Web Tokens (access + refresh), bcryptjs                  |
| Validation| Zod                                                           |
| Docs      | swagger-jsdoc + swagger-ui-express, Postman                   |
| Frontend  | React 18, Vite, React Router, Axios                           |

---

## 📁 Project Structure

```
Vikas-Project/
├── backend/
│   ├── src/
│   │   ├── config/         # env loading/validation, DB connection, Swagger spec
│   │   ├── middleware/     # auth (JWT + RBAC), validation, errors, rate limiting
│   │   ├── modules/        # feature modules — each self-contained
│   │   │   ├── auth/       #   register / login / refresh / logout / me
│   │   │   ├── users/      #   user model + admin user management
│   │   │   └── tasks/      #   Task CRUD (model, service, controller, routes, validation)
│   │   ├── routes/v1/      # versioned route aggregator
│   │   ├── utils/          # ApiError, response helper, asyncHandler, jwt, logger
│   │   ├── app.js          # Express app (middleware pipeline)
│   │   ├── server.js       # bootstrap + graceful shutdown
│   │   └── seed.js         # idempotent admin + sample-task seeder
│   ├── docs/
│   │   └── primetrade.postman_collection.json
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            # axios client (+ refresh interceptor), tasks & users APIs
│   │   ├── components/     # Navbar, ProtectedRoute, Modal, TaskForm
│   │   ├── context/        # AuthContext, ToastContext
│   │   ├── pages/          # Login, Register, Dashboard, AdminUsers
│   │   ├── App.jsx         # routes
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── README.md
└── SCALABILITY.md          # scalability & deployment notes
```

The **module pattern** (`model → validation → service → controller → routes`) means adding a new
entity (e.g. `products`, `notes`) is just copying a folder and registering one line in
`routes/v1/index.js` — no churn in existing code.

---

## 🚀 Getting Started

### ⚡ Fastest path (no database setup) — recommended for reviewers
Needs only **Node.js 18+**. Two terminals:

```bash
# Terminal 1 — backend (spins up an in-memory MongoDB; no .env, no install of any DB needed)
cd backend
npm install
npm run dev:memory          # API on http://localhost:5000  (Swagger: /api/docs)

# Terminal 2 — frontend
cd frontend
npm install
npm run dev                 # open http://localhost:5173
```

Then open **http://localhost:5173**, click **Sign up**, and register — the **first account becomes the admin** automatically. That's it.

> `npm run dev:memory` downloads a small MongoDB binary on first run (one-time, needs internet) and keeps data only while running. To use a persistent database instead (MongoDB Atlas or a local install), follow the detailed steps below.

### Prerequisites
- **Node.js 18+** and npm
- A **MongoDB** database. Pick one:
  - **MongoDB Atlas** (free cloud) — easiest, just paste the connection string, **or**
  - a **locally installed** MongoDB, **or**
  - **nothing at all** — use the built-in zero-install in-memory mode for a quick demo (see below).

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env          # Windows PowerShell: copy .env.example .env
```

Open `.env` and set your secrets. **Minimum to run with a real DB:**
```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/primetrade   # or mongodb://localhost:27017/primetrade
JWT_ACCESS_SECRET=<paste a long random string>
JWT_REFRESH_SECRET=<paste another long random string>
```
Generate strong secrets quickly:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run it:
```bash
# Option A — against the MONGODB_URI you configured
npm run dev

# Option B — zero install, ephemeral in-memory MongoDB (great for a quick demo / no DB handy)
npm run dev:memory
```

Optional — create an admin + sample tasks (uses SEED_ADMIN_* from `.env`):
```bash
npm run seed
# default login -> admin@primetrade.ai / Admin@12345
```

The API is now at **http://localhost:5000**:
- Swagger UI → http://localhost:5000/api/docs
- OpenAPI JSON → http://localhost:5000/api/docs.json
- Health → http://localhost:5000/health

> **Note:** the **first account ever registered is automatically made `admin`** so the system is usable out of the box. Everyone after is a regular `user` (promotable by an admin).

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env          # optional; defaults work with the dev proxy
npm run dev
```
Open **http://localhost:5173**. The Vite dev server proxies `/api` → `http://localhost:5000`, so no CORS setup is needed in development.

---

## 🔌 API Overview

Base URL: `http://localhost:5000/api/v1`

### Auth — `/auth`
| Method | Endpoint     | Auth | Description                                    |
| ------ | ------------ | ---- | ---------------------------------------------- |
| POST   | `/register`  | —    | Create account (1st ever = admin)              |
| POST   | `/login`     | —    | Get access + refresh tokens                    |
| POST   | `/refresh`   | —    | Rotate refresh token, get new access token     |
| POST   | `/logout`    | ✅   | Revoke a refresh token                         |
| GET    | `/me`        | ✅   | Current authenticated user                     |

### Tasks — `/tasks` (auth required)
| Method | Endpoint  | Description                                                  |
| ------ | --------- | ------------------------------------------------------------ |
| GET    | `/`       | List tasks (own; admin sees all) — `page,limit,status,priority,search,sort` |
| POST   | `/`       | Create a task                                                |
| GET    | `/:id`    | Get one task                                                 |
| PATCH  | `/:id`    | Update a task                                                |
| DELETE | `/:id`    | Delete a task                                                |

### Users — `/users` (admin only)
| Method | Endpoint  | Description                                  |
| ------ | --------- | -------------------------------------------- |
| GET    | `/`       | List users — `page,limit,role,search`        |
| GET    | `/:id`    | Get one user                                 |
| PATCH  | `/:id`    | Update a user's `role` / `isActive`          |

**Standard response envelope**
```jsonc
// success
{ "success": true, "message": "Task created", "data": { "task": { /* ... */ } }, "meta": { /* pagination, when listing */ } }
// error
{ "success": false, "message": "Validation failed", "errors": [ { "field": "email", "message": "A valid email is required" } ] }
```

### Quick try with curl
```bash
# register (first user becomes admin)
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"Passw0rd!"}'

# use the returned accessToken
curl http://localhost:5000/api/v1/tasks -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Postman
Import `backend/docs/primetrade.postman_collection.json`. Login/Register requests
auto-store the tokens as collection variables, so every other request just works.

---

## 🔐 Security Notes
- Passwords are **bcrypt-hashed** and never returned (the field is `select:false`).
- **Access tokens** are short-lived (15m default); **refresh tokens** are long-lived, **rotated on every use**, stored **only as bcrypt hashes**, and revoked on logout/deactivation.
- **Input validation** on every endpoint via Zod; Mongo operators (`$`, `.`) are stripped to prevent **NoSQL injection**; **HPP** guards against parameter pollution.
- **Helmet** sets secure headers; **CORS** is restricted to an allow-list; **rate limiting** throttles abuse (stricter on auth routes).
- Frontend tokens live in `localStorage` for demo simplicity — see [SCALABILITY.md](SCALABILITY.md) for the httpOnly-cookie hardening path.

---

## 📈 Scalability & Deployment
See **[SCALABILITY.md](SCALABILITY.md)** for the modular-monolith → microservices path, caching (Redis), load balancing, statelessness/horizontal scaling, DB indexing, and observability.

---

## 🗺️ Data Model (MongoDB)

**User**: `name`, `email` (unique, indexed), `password` (hashed, hidden), `role` (`user|admin`), `isActive`, `refreshTokens[]` (hashed, hidden), timestamps.

**Task**: `title`, `description`, `status` (`todo|in_progress|done`), `priority` (`low|medium|high`), `dueDate`, `owner` (→ User, indexed), timestamps. Compound index on `{ owner, status, createdAt }` for the common list query.
