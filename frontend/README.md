<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&height=150&color=0:38BDF8,50:14B8A6,100:2563EB&text=AI%20Queue%20Frontend&fontColor=ffffff&fontSize=36&fontAlignY=38&animation=fadeIn" alt="AI Queue Frontend" />

  <br />

  <img src="https://img.shields.io/badge/React-19-38BDF8?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Create%20React%20App-5-09D3AC?style=for-the-badge&logo=createreactapp&logoColor=white" alt="Create React App" />
  <img src="https://img.shields.io/badge/UI-TV%20Cast%20Ready-7C3AED?style=for-the-badge" alt="TV Cast Ready" />
  <img src="https://img.shields.io/badge/API-Flask%20Backend-111827?style=for-the-badge&logo=flask&logoColor=white" alt="Flask Backend" />

</div>

# Frontend App

> React interface for AI Queue Automation: login, registration, dashboards, profile settings, TV Cast, queue tokens, notifications, themes, and public display screens.

## Quick Start

```powershell
cd frontend
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start development server |
| `npm test` | Run React tests |
| `npm run build` | Build production frontend |

## Environment

The frontend reads the backend origin from:

```text
REACT_APP_API_ORIGIN=http://localhost:5000
```

Docker passes this value during the frontend image build.

## Main UI Areas

- Auth pages and terms modal
- User dashboard
- Admin/operator dashboard
- Service provider dashboard
- Profile and theme settings
- TV Cast settings
- Public TV display route: `/tv-display/:branchId/:counterId`

## Notes

This app was bootstrapped with Create React App, but the README is project-focused so new developers can work faster.
