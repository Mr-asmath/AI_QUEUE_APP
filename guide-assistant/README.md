# AI Queue Guide Assistant

A complete standalone AI-style chatbot assistant that can run independently and later be embedded into AI Queue as a widget, iframe, or API-backed service.

## Stack

- React.js frontend with responsive widget UI
- Node.js + Express backend
- Local editable JSON knowledge base
- Web Speech API speech-to-text
- Browser text-to-speech
- Session memory and in-memory analytics

## Project Structure

```text
guide-assistant/
  backend/
    routes/
    services/
    server.js
  data/
    faq.json
    helpFlows.json
    intents.json
  frontend/
    src/
      components/
```

## Run Locally

```bash
cd guide-assistant
npm install
npm run install:all
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5050`

## API Endpoints

- `POST /api/chat/message`
- `GET /api/chat/suggestions`
- `GET /api/chat/help-flow/:intent`
- `GET /api/chat/faq`
- `POST /api/chat/feedback`
- `GET /api/chat/analytics`

## Message API Example

```bash
curl -X POST http://localhost:5050/api/chat/message \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"I want to create a token\",\"sessionId\":\"demo-session\"}"
```

## Integration Options

### Widget

Build the frontend and include the generated bundle in an AI Queue page later.

```bash
npm run build --prefix frontend
```

### Iframe

Host the standalone frontend and embed:

```html
<iframe
  src="https://assistant.example.com"
  title="AI Queue Guide Assistant"
  style="border:0;width:420px;height:720px"
></iframe>
```

### API Service

AI Queue can call the backend directly through `POST /api/chat/message`. The response includes the detected intent, text response, optional steps, follow-up actions, and session context.

## Future Upgrade Points

- Replace `backend/services/intentDetectionService.js` with OpenAI, Gemini, Claude, or an internal NLP service.
- Extend `backend/services/responseService.js` to call AI Queue APIs for live queue status, token data, TV display systems, and customer records.
- Persist sessions and analytics by replacing `backend/services/sessionService.js` and `backend/services/analyticsService.js` with a database.
- Add authentication and tenant headers before connecting to production AI Queue APIs.

## Knowledge Base Editing

Update these files without changing code:

- `data/intents.json`: supported intents and keyword patterns
- `data/helpFlows.json`: step-by-step guidance
- `data/faq.json`: FAQ entries and aliases
