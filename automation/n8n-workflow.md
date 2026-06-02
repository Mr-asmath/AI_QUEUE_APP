<div align="center">

  <img src="https://readme-typing-svg.demolab.com?font=Segoe+UI&weight=800&size=26&duration=2500&pause=700&color=F97316&center=true&vCenter=true&width=720&lines=n8n+Queue+Automation;Scheduled+Token+Expiry+%2B+Reminder+Worker;Docker+Self-Hosted+Workflow" alt="n8n automation animated title" />

  <br />

  <img src="https://img.shields.io/badge/n8n-Automation-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/Schedule-5%20Minutes-F97316?style=for-the-badge" alt="Schedule" />
  <img src="https://img.shields.io/badge/API-Flask-111827?style=for-the-badge&logo=flask&logoColor=white" alt="Flask API" />

</div>

# n8n Automation Workflow

> Scheduled workflow that keeps queue expiry, reminders, and duplicate-token cleanup moving quietly in the background.

Use the free self-hosted n8n service from `docker-compose.yml` to trigger queue automation.

1. Open `http://localhost:5678`.
2. Login with `admin / admin123`.
3. Create a workflow with a **Schedule Trigger** every 5 minutes.
4. Add an **HTTP Request** node:
   - Method: `POST`
   - URL: `http://backend:5000/api/automation/run`
   - Header: `X-Automation-Key: local-automation-key`
5. Activate the workflow.

The endpoint expires old tokens, sends 10-minute reminder notifications, and keeps the duplicate-token guard clean.
