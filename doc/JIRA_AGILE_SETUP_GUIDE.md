# Jira Agile Setup Guide - AI Queue App

This guide helps you create the Atlassian Jira setup for the AI Queue Management System. Keep your Gmail and Atlassian password private. Log in yourself using `python.asmath1290@gmail.com`.

## 1. Create Or Open Atlassian

1. Open `https://id.atlassian.com/login`.
2. Log in with `python.asmath1290@gmail.com`.
3. If Atlassian asks to create a site, use:
   - Site name: `ai-queue-app`
   - Product: `Jira Software`
   - Plan: Free

## 2. Create Scrum Project

1. Open Jira.
2. Select `Projects`.
3. Select `Create project`.
4. Choose `Scrum`.
5. Choose `Company-managed project`.
6. Use:
   - Project name: `AI Queue Management System`
   - Project key: `AIQ`
7. Create the project.

Use this project for product features, bugs, UI, database, authentication, compliance, TV Cast, and documentation work.

## 3. Create Kanban Project

1. Select `Projects`.
2. Select `Create project`.
3. Choose `Kanban`.
4. Choose `Company-managed project`.
5. Use:
   - Project name: `AI Queue DevOps & Support`
   - Project key: `AIQOPS`
6. Create the project.

Use this project for deployment, Docker, Kubernetes, GitHub Actions, monitoring, backups, and production support.

## 4. Import Scrum Backlog CSV

CSV file:

`doc/jira_aiq_scrum_backlog.csv`

Steps:

1. Open `AI Queue Management System`.
2. Go to project settings or Jira administration.
3. Open `External system import`.
4. Choose `CSV`.
5. Upload `doc/jira_aiq_scrum_backlog.csv`.
6. Map fields:
   - `Issue Type` -> Issue Type
   - `Epic Name` -> Epic Name
   - `Epic Link` -> Epic Link or Parent Epic
   - `Summary` -> Summary
   - `Description` -> Description
   - `Priority` -> Priority
   - `Labels` -> Labels
   - `Component` -> Component
   - `Story Points` -> Story Points
   - `Sprint` -> Sprint
7. Import.

If Jira does not allow direct sprint import, import all issues first, then create sprints manually:

- Sprint 1: Login, roles, dashboard stability, Docker frontend/backend
- Sprint 2: MongoDB storage, profile images, data persistence
- Sprint 3: OTP verification, terms, consent, compliance improvements
- Sprint 4: TV Cast mode, monitoring, analytics, documentation

## 5. Import Kanban DevOps CSV

CSV file:

`doc/jira_aiqops_kanban_backlog.csv`

Steps:

1. Open `AI Queue DevOps & Support`.
2. Open `External system import`.
3. Choose `CSV`.
4. Upload `doc/jira_aiqops_kanban_backlog.csv`.
5. Map the same fields as the Scrum CSV.
6. Import.

## 6. Configure Kanban Columns

Create these Kanban columns:

- Backlog
- Ready
- In Progress
- Code Review
- Testing
- Done

Recommended status mapping:

- Backlog -> To Do
- Ready -> Selected for Development
- In Progress -> In Progress
- Code Review -> In Review
- Testing -> Testing
- Done -> Done

## 7. Invite Your Friend

1. Open Atlassian admin or Jira project settings.
2. Select `People` or `User management`.
3. Invite your friend's email address.
4. Give access to Jira Software.
5. Add the friend to both projects.
6. Suggested role:
   - Developer for normal coding work
   - Administrator only if they should manage workflows, imports, and project settings

## 8. Connect GitHub Manually

1. Open Jira.
2. Go to `Apps`.
3. Search for `GitHub for Jira`.
4. Install the app.
5. Connect your GitHub account or organization.
6. Select the repository for this project.
7. Use branch names like:
   - `AIQ-12-fix-profile-image`
   - `AIQOPS-5-vercel-deploy`
8. Jira will connect commits and pull requests when the issue key is included.

## 9. Daily Scrum Workflow

Use the Scrum project for planned development:

1. Add new ideas to the backlog.
2. Move ready items into the next sprint.
3. Start the sprint.
4. Update each issue daily:
   - To Do
   - In Progress
   - Code Review
   - Testing
   - Done
5. Close the sprint when all finished issues are done.
6. Move unfinished issues to the next sprint.

## 10. Daily Kanban Workflow

Use the Kanban project for operations:

1. Add production/deployment work to Backlog.
2. Move urgent deployment tasks to Ready.
3. Move active work to In Progress.
4. Move completed changes to Testing.
5. Move verified tasks to Done.

## 11. Recommended Labels

- `frontend`
- `backend`
- `docker`
- `kubernetes`
- `vercel`
- `render`
- `mongodb`
- `security`
- `compliance`
- `bug`
- `documentation`

## 12. References

- Jira Software setup: `https://confluence.atlassian.com/jirasoftware/setting-up-your-workspace-1688898145.html`
- Jira CSV import: `https://support.atlassian.com/jira-software-cloud/docs/import-data-into-jira/`
- Jira Agile: `https://www.atlassian.com/software/jira/agile`
