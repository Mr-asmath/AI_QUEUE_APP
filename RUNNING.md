# AI Queue Automation - Running Commands

This project has a Flask backend and a React frontend.

## Demo Accounts

```text
Main admin:     admin@queue.com / admin123
Industry admin: industry@queue.com / demo123
Queue operator: operator@queue.com / demo123
Provider:       provider@queue.com / demo123
```

## Run Locally Without Docker

Open two terminals from the project root.

### Terminal 1 - Backend

```powershell
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

If pip reports old dependency conflicts, clear the local resolver cache and install again:

```powershell
python -m pip cache purge
pip install -r requirements.txt
```

Backend runs at:

```text
http://localhost:5000
```

Password reset email sender defaults to:

```text
python.asmath1290@gmail.com
```

To send real emails, set SMTP values in `backend/.env`. For Gmail, use a Gmail App Password rather than your normal account password:

```text
MAIL_SENDER=python.asmath1290@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=python.asmath1290@gmail.com
SMTP_PASSWORD=<gmail-app-password>
SMTP_USE_TLS=true
FRONTEND_URL=http://localhost:3000
```

Health check:

```powershell
Invoke-WebRequest http://localhost:5000/health -UseBasicParsing
```

### Terminal 2 - Frontend

For development mode:

```powershell
cd frontend
npm install
npm start
```

Frontend runs at:

```text
http://localhost:3000
```

If `npm start` has issues, build and serve the static app:

```powershell
cd frontend
npm install
node node_modules/react-scripts/scripts/build.js
cd build
python -m http.server 3000
```

## Run With Docker Compose

From the project root:

```powershell
cd "D:\program\node js\AI_QUEUE-main"
docker compose up --build
```

Services:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000
n8n:      http://localhost:5678
```

n8n login:

```text
admin / admin123
```

Stop services:

```powershell
docker compose down
```

Stop and delete volumes/database:

```powershell
docker compose down -v
```

View logs:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f n8n
```

## Run Backend With Docker Only

Run this from the project root:

```powershell
cd "D:\program\node js\AI_QUEUE-main"
docker build -t ai-queue-backend ./backend
```

Or, if you are already inside the backend folder, use `.` as the build context:

```powershell
cd "D:\program\node js\AI_QUEUE-main\backend"
docker build -t ai-queue-backend .
```

Run the backend container:

```powershell
docker run --name ai-queue-backend --rm -p 5000:5000 `
  -e SECRET_KEY=change-me `
  -e DATABASE_URL=sqlite:////data/multi_industry_queue.db `
  -e TOKEN_TTL_MINUTES=60 `
  -e REMINDER_WINDOW_MINUTES=10 `
  -v ai-queue-data:/data `
  ai-queue-backend
```

Health check:

```powershell
Invoke-WebRequest http://localhost:5000/health -UseBasicParsing
```

## Run Frontend With Docker Only

Run this from the project root:

```powershell
cd "D:\program\node js\AI_QUEUE-main"
docker build -t ai-queue-frontend ./frontend
```

Or, if you are already inside the frontend folder:

```powershell
cd "D:\program\node js\AI_QUEUE-main\frontend"
docker build -t ai-queue-frontend .
```

Run:

```powershell
docker run --name ai-queue-frontend --rm -p 3000:80 ai-queue-frontend
```

Open:

```text
http://localhost:3000
```

## Run n8n Automation

With Docker Compose, n8n starts automatically:

```powershell
docker compose up --build n8n
```

Open:

```text
http://localhost:5678
```

Create a workflow:

1. Add a Schedule Trigger every 5 minutes.
2. Add an HTTP Request node.
3. Method: `POST`
4. URL:

```text
http://backend:5000/api/automation/run
```

5. Header:

```text
X-Automation-Key: local-automation-key
```

The automation endpoint expires old tokens and sends reminder notifications.

Manual automation test:

```powershell
Invoke-WebRequest http://localhost:5000/api/automation/run `
  -Method POST `
  -Headers @{ "X-Automation-Key" = "local-automation-key" } `
  -UseBasicParsing
```

## Kubernetes Commands

Build local images:

```powershell
docker build -t ai-queue-backend:latest ./backend
docker build -t ai-queue-frontend:latest ./frontend
```

Apply manifests:

```powershell
kubectl apply -f k8s/secrets.example.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

Check pods and services:

```powershell
kubectl get pods
kubectl get services
```

Port forward locally:

```powershell
kubectl port-forward service/ai-queue-backend 5000:5000
kubectl port-forward service/ai-queue-frontend 3000:80
```

Delete Kubernetes resources:

```powershell
kubectl delete -f k8s/frontend.yaml
kubectl delete -f k8s/backend.yaml
kubectl delete -f k8s/secrets.example.yaml
```

## Useful API Checks

```powershell
Invoke-WebRequest http://localhost:5000/health -UseBasicParsing
Invoke-WebRequest http://localhost:5000/api/catalog -UseBasicParsing
```

## Common Problems

### Docker Desktop Linux engine is not running

If you see this error:

```text
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

Docker Desktop is not started, or the Linux engine is stopped.

Fix:

1. Open **Docker Desktop** from the Windows Start Menu.
2. Wait until it says **Docker Desktop is running**.
3. Make sure Docker is using Linux containers.
4. Run:

```powershell
docker version
docker info
```

Then run the project again:

```powershell
cd "D:\program\node js\AI_QUEUE-main"
docker compose up --build
```

If Docker Desktop is open but still broken, restart it:

```powershell
wsl --shutdown
```

Then reopen Docker Desktop and wait for it to start.

### Docker build path not found

If you are inside this folder:

```text
D:\program\node js\AI_QUEUE-main\backend
```

Do not run:

```powershell
docker build -t ai-queue-backend ./backend
```

Because that looks for:

```text
D:\program\node js\AI_QUEUE-main\backend\backend
```

Use:

```powershell
docker build -t ai-queue-backend .
```

If you are in the project root, use:

```powershell
docker build -t ai-queue-backend ./backend
```

### Port already in use

Check running Python processes:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'python.exe'" | Select-Object ProcessId,CommandLine
```

Stop a process:

```powershell
Stop-Process -Id <PROCESS_ID> -Force
```

### Reset local SQLite data

Stop the backend, then remove the SQLite database under:

```text
backend/instance/
```

The app seeds demo data again on next backend start.
