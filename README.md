# ScamBook — Community Scam Sharing Platform

Production-style full-stack social feed: **Node.js + Express**, **MySQL** (AWS RDS–compatible), **Bootstrap 5** frontend with a Facebook-inspired layout. Images are stored under `backend/assets/uploads/` (structured so you can switch to **Amazon S3** later by uploading there and saving the HTTPS URL in `profile_image` / `image_url`).

## Project layout

```
ScamBook/
├── backend/                # Express app (server.js + config/controllers/models/routes)
├── frontend/               # HTML pages
├── database/schema.sql
├── package.json
├── package-lock.json
└── README.md
```

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register |
| POST | `/login` | — | Login (returns JWT) |
| PUT | `/update-profile` | JWT | Multipart: `name`, optional `profile_image` |
| GET | `/me` | JWT | Current user (helper) |
| POST | `/create-post` | JWT | JSON `{ content }` or multipart + `image` |
| GET | `/posts` | Optional JWT | Feed + like counts + comments; JWT sets `liked_by_me` |
| POST | `/comment` | JWT | `{ post_id, comment }` |
| POST | `/like` | JWT | Toggle like `{ post_id }` |
| GET | `/health` | — | Load balancer health |

Static files: `/assets/...` (CSS, JS, uploads).

---

## Run locally

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MySQL](https://dev.mysql.com/downloads/mysql/) 8.x (or MariaDB with InnoDB)

### 1. Database

```bash
mysql -u root -p < database/schema.sql
```

### 2. Environment

Copy `.env.example` to `.env` and set `DB_*`, `JWT_SECRET`, and `PORT`.

### 3. Install & start

```bash
cd ScamAlert
npm install
npm start
```

Open **http://localhost:3000** — you’ll be redirected to login or feed.

### Development

```bash
npm run dev
```

(Node `--watch` restarts the server on file changes.)

---

## Deploy on AWS EC2 (overview)

High level: **EC2** runs Node behind **nginx** (or **ALB**), **RDS MySQL** holds data, optional **S3 + CloudFront** for media, **Secrets Manager** (or SSM) for `JWT_SECRET` and DB password.

### 1. RDS MySQL

- Create a MySQL RDS instance (same major version as local).
- Security group: allow inbound **3306** from your EC2 security group only.
- Run `database/schema.sql` against the RDS endpoint (use a jump host or local tunnel).

### 2. EC2

- Launch Amazon Linux 2023 or Ubuntu LTS.
- Install Node 18+ (nvm or NodeSource).
- Clone the repo, `npm install --production`, copy `.env` with:

  - `DB_HOST=<rds-endpoint>`
  - `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT=3306`
  - Strong `JWT_SECRET`
  - `PORT=3000` (or whatever nginx proxies to)

- Run with a process manager:

  ```bash
  npm install -g pm2
  pm2 start backend/server.js --name scambook
  pm2 save
  pm2 startup
  ```

### 3. Reverse proxy (nginx)

- Terminate TLS at nginx or ALB.
- Proxy `/` to `http://127.0.0.1:3000`.
- Client max body size for uploads (e.g. `client_max_body_size 12m;`).

### 4. Security groups & firewall

- Open **80/443** to the internet (or ALB only).
- Do **not** expose MySQL to `0.0.0.0/0`.

### 5. Moving uploads to S3 (later)

- Upload files in controllers (or a dedicated service) to S3 via SDK.
- Store **public HTTPS URLs** (or CloudFront URLs) in `users.profile_image` and `posts.image_url`.
- Remove or stop using local `multer.diskStorage` for those fields; keep the same API contract for the app.

### 6. Other AWS services (optional)

- **API Gateway + Lambda**: wrap Express with `serverless-http` or split routes; use RDS Proxy for DB connections.
- **SQS**: async jobs (image processing, moderation).
- **SNS**: notifications to email/SMS for “latest alerts.”

---

## Security notes (production)

- Use strong `JWT_SECRET`, HTTPS only, secure cookies if you move tokens to cookies.
- Rate-limit `/login` and `/register`.
- Validate file types and size (already limited in multer); scan uploads in production.
- Keep dependencies updated (`npm audit`).

## License

MIT (or your choice) — project scaffold for ScamBook.
