# AI Queue Guide Assistant Setup

This folder is a separate guide chatbot project for the AI Queue Management System.

It does not change the existing AI Queue frontend, backend, database, queue logic, authentication, Render, or Vercel setup. It now runs automatically as separate Docker Compose services when the main AI Queue stack starts.

## What This Assistant Does

- Answers common AI Queue usage questions.
- Guides users through token, queue, counter, branch, analytics, login, TV display, feedback, and support workflows.
- Uses local JSON knowledge files.
- Runs as a separate Express API and Vite React widget.

## Folder Structure

```text
guide-assistant/
  backend/
    server.js
    routes/
    services/
  frontend/
    src/
      components/
  data/
    intents.json
    helpFlows.json
    faq.json
```

## Install

Run from the AI Queue project root:

```powershell
cd E:\Projects\Live\AI-Queue-App\guide-assistant
npm install
npm run install:all
```

If `npm install` is slow or stuck on Windows:

1. Close all terminals running `npm`, `node`, `vite`, or `react-scripts`.
2. Open a new PowerShell terminal.
3. Run:

```powershell
cd E:\Projects\Live\AI-Queue-App\guide-assistant\backend
npm install
cd ..\frontend
npm install
```

## Run

### Run Automatically With The Main App

From the AI Queue project root:

```powershell
cd E:\Projects\Live\AI-Queue-App
docker compose up --build
```

This starts:

```text
AI Queue frontend:       http://localhost:3000
AI Queue backend:        http://localhost:5000
Guide Assistant UI:      http://localhost:5051
Guide Assistant API:     http://localhost:5050/health
```

To run in the background:

```powershell
docker compose up --build -d
docker compose ps
```

To view only guide assistant logs:

```powershell
docker compose logs -f guide-backend
docker compose logs -f guide-frontend
```

### Run Only The Guide Assistant Manually

Run both backend and frontend:

```powershell
cd E:\Projects\Live\AI-Queue-App\guide-assistant
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5050
```

## Test Backend

Health check:

```powershell
Invoke-WebRequest -Uri "http://localhost:5050/health" -UseBasicParsing
```

Chat test:

```powershell
$body = @{ message = "How do I create a token?"; sessionId = "demo-session" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:5050/api/chat/message" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
```

Expected result:

- HTTP status `200`
- Response includes `detectedIntent`
- Response includes guide steps for creating a token

## Build Frontend

```powershell
cd E:\Projects\Live\AI-Queue-App\guide-assistant\frontend
npm run build
```

Preview build:

```powershell
npm run preview
```

## Knowledge Base Editing

Edit these files:

- `data/intents.json`
- `data/helpFlows.json`
- `data/faq.json`

After editing JSON, restart the backend.

## Current Validation

Completed checks:

- Backend JavaScript syntax check passed.
- Guide JSON files parse correctly.
- Backend `/health` endpoint returned `200`.
- Backend `/api/chat/message` returned `200` for `How do I create a token?`.

Docker note:

- The assistant is intentionally separate from the main AI Queue app code.
- `docker compose up --build` starts it together with the main frontend and backend.
- The assistant frontend uses the assistant API at `http://localhost:5050`.
