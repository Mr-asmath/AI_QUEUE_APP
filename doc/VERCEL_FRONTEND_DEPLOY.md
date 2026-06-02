# Vercel Frontend Deployment Guide

This project already includes `vercel.json` for deploying the React frontend from the `frontend` folder.

Backend deployment is not changed. The frontend should call the existing backend URL through `REACT_APP_API_ORIGIN`.

## 1. Install Vercel CLI

Run from PowerShell:

```powershell
npm install --global vercel
```

Check install:

```powershell
vercel --version
```

## 2. Login To Vercel

Use your own Vercel account login:

```powershell
vercel login
```

Choose the email/login method shown by Vercel.

## 3. Link This Project

Run from the project root:

```powershell
cd E:\Projects\Live\AI-Queue-App
vercel link
```

Recommended answers:

- Set up and deploy: `Y`
- Scope/account: choose your account/team
- Link to existing project: choose `N` if this is first setup
- Project name: `ai-queue-app-frontend`
- Directory: `./`

The root `vercel.json` will build the frontend using:

```powershell
cd frontend && npm ci && npm run build
```

And deploy output from:

```powershell
frontend/build
```

## 4. Add Backend API URL

Set production environment variable:

```powershell
vercel env add REACT_APP_API_ORIGIN production
```

Value:

```text
https://ai-queue-app-backend.onrender.com
```

For preview deployments, also add:

```powershell
vercel env add REACT_APP_API_ORIGIN preview
```

Use the same backend URL unless you have a separate staging backend.

## 5. Deploy Frontend

Production deploy:

```powershell
vercel --prod
```

Preview deploy:

```powershell
vercel
```

## 6. GitHub Actions CI/CD

The workflow file is already added:

```text
.github/workflows/vercel-frontend.yml
```

Add these GitHub repository secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

Get values:

```powershell
vercel project ls
```

Or check `.vercel/project.json` after `vercel link`.

Create a Vercel token from:

```text
https://vercel.com/account/tokens
```

After secrets are added, every push to `main` or `master` will build and deploy the frontend to Vercel.

## 7. Docker Note

The frontend Dockerfile still works for Docker/Kubernetes:

```powershell
docker build -t ai-queue-frontend ./frontend
docker run -p 8080:80 ai-queue-frontend
```

Vercel normally deploys the static React build, not the Docker container.

## 8. Quick Test After Deploy

Open the Vercel frontend URL and verify:

- Welcome page loads.
- `Get Started` opens the login flow.
- Login calls the Render backend.
- TV display route loads if opened.
- Browser console has no API CORS errors.
