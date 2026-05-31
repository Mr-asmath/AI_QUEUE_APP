<div align="center">

  <img src="https://readme-typing-svg.demolab.com?font=Segoe+UI&weight=700&size=30&duration=2800&pause=700&color=14B8A6&center=true&vCenter=true&width=850&lines=AI+Queue+Automation;Multi-Industry+Queue+Management;React+%2B+Flask+%2B+Docker+%2B+MongoDB+%2B+Redis" alt="AI Queue Automation animated title" />

  <br />

  <img src="https://img.shields.io/badge/Frontend-React-38BDF8?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Backend-Flask-111827?style=for-the-badge&logo=flask&logoColor=white" alt="Flask" />
  <img src="https://img.shields.io/badge/Database-MongoDB-22C55E?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Cache-Redis-EF4444?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Run-Docker-2563EB?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />

</div>

---

## Project Overview

AI Queue App is a multi-industry queue management system with a React frontend and Flask backend. It supports hospitals, schools/colleges, banks, hotels, offices/companies, government offices, and custom industries.

The app helps teams manage:

- User registration and login sessions.
- Queue token generation, tracking, cancellation, and history.
- Branches, staff, providers, role names, service fields, and dashboard settings.
- Main admin, industry admin, queue operator, service provider, and user workflows.
- Profile image and logo uploads.
- Docker-based local development with MongoDB, Redis, Prometheus, mongo-express, and n8n.

---

## Setup Guide for Teammate

The full laptop setup and installation guide for Tharshini is available here:

[`doc/word/AI_Queue_App_Setup_Installation_Guide_Tharshini.docx`](doc/word/AI_Queue_App_Setup_Installation_Guide_Tharshini.docx)

It includes:

- Laptop apps to install.
- VS Code extensions.
- Frontend and backend package lists.
- Docker setup.
- Git pull, commit, and push workflow.
- `main` branch update flow.
- `tharshini` branch workflow.
- Step-by-step running commands.

---

## Required Apps

| App | Purpose |
| --- | --- |
| Git | Clone, pull, commit, and push code |
| GitHub account | Collaborate on the repository |
| Visual Studio Code | Code editor |
| Node.js 20 LTS | Run React frontend |
| Python 3.11 | Run Flask backend |
| Docker Desktop | Run full stack locally |
| Chrome or Edge | Test the app |
| MongoDB Compass optional | Inspect MongoDB data |
| Postman optional | Test API routes |

---

## VS Code Extensions

- Python
- Pylance
- ESLint
- Prettier
- Docker
- YAML
- GitLens optional
- MongoDB for VS Code optional

---

## Quick Start With Docker

Run the full app stack from the project root:

```powershell
cd E:\Projects\Live\AI-Queue-App
docker compose config
docker compose up --build
```

Run in background:

```powershell
docker compose up --build -d
docker compose ps
```

Open:

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend health | http://localhost:5000/health |
| Backend metrics | http://localhost:5000/metrics |
| Mongo Express | http://localhost:8081 |
| Prometheus | http://localhost:9090 |
| n8n | http://localhost:5678 |

Stop services:

```powershell
docker compose down
```

Stop and delete local Docker volumes/data:

```powershell
docker compose down -v
```

---

## Run Without Docker

Open two terminals.

### Terminal 1: Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Backend runs at:

```text
http://localhost:5000
```

### Terminal 2: Frontend

```powershell
cd frontend
npm install
npm start
```

Frontend runs at:

```text
http://localhost:3000
```

---

## Git Workflow for Tharshini

First clone the repository:

```powershell
cd E:\Projects
git clone https://github.com/<owner>/<repo-name>.git AI-Queue-App
cd AI-Queue-App
git status
```

Configure Git once:

```powershell
git config --global user.name "Tharshini"
git config --global user.email "tharshini@example.com"
```

Always update `main` first:

```powershell
git checkout main
git pull origin main
```

Create and work in the `tharshini` branch:

```powershell
git checkout -b tharshini
```

If the branch already exists:

```powershell
git checkout tharshini
git pull origin tharshini
```

Bring latest `main` changes into `tharshini`:

```powershell
git checkout main
git pull origin main
git checkout tharshini
git merge main
```

Commit and push work:

```powershell
git status
git add .
git commit -m "Describe the change clearly"
git push origin tharshini
```

First push for the branch:

```powershell
git push -u origin tharshini
```

Useful Git check commands:

```powershell
git status
git diff
git log --oneline --decorate -10
```

---

## Main Role Mapping

| Industry | Admin Role | Counter Role | Service Role |
| --- | --- | --- | --- |
| Hospital | Manager / Hospital Admin | Token Desk Staff / Front Office Staff | Doctor / Nurse / Consultant |
| School / College | Principal / School Admin | Front Office Staff / Admission Desk Staff | Teacher / Faculty / Counsellor |
| Bank | Branch Manager | Token Counter Staff | Bank Official / Teller |
| Hotel | Hotel Manager | Receptionist | Service Staff / Service Manager |
| Office / Company | Office Manager | Front Desk Executive | Executive / Consultant |
| Government Office | Department Admin | Service Counter Staff | Officer / Clerk |

---

## Demo Accounts

| Role | Login |
| --- | --- |
| Main admin | `admin@queue.com / admin123` |
| Industry admin | `industry@queue.com / demo123` |
| Queue operator | `operator@queue.com / demo123` |
| Provider | `provider@queue.com / demo123` |

---

## Package Summary

### Frontend

- React
- React DOM
- React Scripts
- Testing Library
- Web Vitals

### Backend

- Flask
- Flask-CORS
- Flask-SQLAlchemy
- Werkzeug
- Gunicorn
- python-dotenv
- Redis
- PyMongo
- psycopg2-binary

### Docker Services

- Backend Flask API
- Frontend nginx server
- MongoDB
- Redis
- mongo-express
- Prometheus
- n8n

---

## Troubleshooting

If `npm ci` fails with network timeout:

```powershell
docker compose build frontend
docker compose up -d
```

If Docker Desktop build crashes:

```powershell
docker builder prune
docker compose build frontend --no-cache
docker compose up -d
```

If ports are already used:

```powershell
docker compose down
netstat -ano | findstr :3000
netstat -ano | findstr :5000
```

If data must be reset:

```powershell
docker compose down -v
docker compose up --build
```

---

## Documentation

- Setup guide for Tharshini: [`doc/word/AI_Queue_App_Setup_Installation_Guide_Tharshini.docx`](doc/word/AI_Queue_App_Setup_Installation_Guide_Tharshini.docx)
- DevOps guide: [`doc/word/AI_Queue_App_DevOps_New_Joiner_Guide.docx`](doc/word/AI_Queue_App_DevOps_New_Joiner_Guide.docx)
- Project report: [`doc/word/AI_Queue_App_Project_Report.docx`](doc/word/AI_Queue_App_Project_Report.docx)
- Running commands: [`RUNNING.md`](RUNNING.md)

---

<div align="center">

  <strong>AI Queue Automation</strong>

  Built for multi-industry queue, branch, staff, and service workflows.

</div>
