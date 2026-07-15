# Deployment Checklist

## Required Environment Variables

Set these on your hosting provider:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
SESSION_SECRET=use-a-long-random-secret
NODE_ENV=production
```

Optional production switches:

```bash
SEED_DEFAULT_DATA=false
ENABLE_DEMO_USERS=false
```

Use `SEED_DEFAULT_DATA=true` only for the first deploy if you want the app to create default room types and doctor profiles. Keep `ENABLE_DEMO_USERS=false` for real hospital use.

## First-Time Database Setup

After creating the production PostgreSQL database, run:

```bash
npm install
npm run db:push
```

This syncs the Drizzle schema to the production database using `DATABASE_URL`.

## Build And Start

Use these commands on the hosting provider:

```bash
npm install
npm run build
npm start
```

The app serves both the API and frontend from the same Node server in production.

## Recommended Hosting Setup

Use a Node hosting provider with PostgreSQL, such as Railway, Render, Fly.io, or a Node service connected to Neon/Supabase Postgres.

## Hospital Local Network Setup

Use this when one office PC runs 24/7 and other hospital computers open the site through LAN.

### 1. Push Code To GitHub From Your Development PC

Do not commit `.env`. It contains the real database password and is intentionally ignored by Git.

```powershell
git status
git add .
git commit -m "Update Criticare IPD"
git push origin main
```

### 2. Prepare The 24/7 Office PC

Install these on the office PC:

- Git for Windows
- Node.js LTS
- PostgreSQL

Create a PostgreSQL database, for example:

```sql
CREATE DATABASE criticare;
```

Clone the GitHub repo:

```powershell
cd D:\
git clone https://github.com/Gr8Harsh/criticare.git CRITICARE
cd D:\CRITICARE
npm install
```

Create `D:\CRITICARE\.env` on the office PC:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/criticare
SESSION_SECRET=replace-with-a-long-random-secret
PORT=5000
SEED_DEFAULT_DATA=false
ENABLE_DEMO_USERS=false
SESSION_SECURE=false
```

First build and database sync:

```powershell
npm run build
npm run db:push
powershell.exe -ExecutionPolicy Bypass -File .\script\office-start.ps1
```

### 3. Make The Site Open On Hospital LAN

Find the office PC IPv4 address:

```powershell
ipconfig
```

Open the site from another computer using:

```text
http://OFFICE_PC_IP:5000
```

Example:

```text
http://172.20.10.2:5000
```

If it does not open, allow port `5000` in Windows Defender Firewall on the office PC.

### 4. Automatic Updates From GitHub

Run this once on the office PC:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\script\office-install-tasks.ps1
```

This installs two scheduled tasks:

- `Criticare IPD Auto Deploy`: checks GitHub every 2 minutes. If new code exists, it pulls, installs dependencies, checks TypeScript, builds, syncs database schema, and restarts the site.
- `Criticare IPD Start On Boot`: starts the site automatically when the office PC turns on.

After this, your workflow is:

```powershell
git add .
git commit -m "Your change message"
git push origin main
```

Within about 2 minutes, the office PC should update the live LAN site automatically.

### 5. Important Notes

- Keep the office PC awake. Disable sleep in Windows power settings.
- Keep PostgreSQL running as a Windows service.
- Do not edit code directly on the office PC, otherwise `git pull --ff-only` may fail.
- For real hospital use, keep `ENABLE_DEMO_USERS=false`.
- Database data stays on the office PC PostgreSQL server. GitHub stores only the website code, not patient data.

Before going live, test these flows on the production database:

- Login
- Add and edit patient
- Add advance amount
- Add visits, medicines, procedures, surgeries, prosthesis
- Delete room configuration rows
- Discharge patient
- Print receipt
- Open all bill modes

bf9fe98c510488bd51fc11ae4927edf226e878e8fbced8103c511709eb883b183a107dd04b2b7fecd75aa11d9924d1b8f78c2491ab3a14fb00fa49e2adfd2d2f.9b88a16ea9835622a0b7541ee84215f1
