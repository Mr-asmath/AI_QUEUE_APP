# n8n Automation Workflow

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
