# AI Queue App Working Notes and Todo Tree

## Done

- Free Render backend deployment configured.
- GitHub Pages frontend configured to call the Render backend.
- SQLite startup fixed for Render by creating the Flask instance folder.
- Tokens are verified automatically on creation.
- Token Desk Staff flow now uses Customer In before service allocation.
- Token cancellation is available on user and staff sides.
- Cancelled tokens display as cancelled on both sides.
- Online/offline user presence added with a 10-minute activity window.
- Industry Settings moved into the Profile page.
- Token name mode added: Default name or Customer name.
- Customer name mode supports up to three customer name inputs.
- Industry role labels added with listbox choices.
- Branch address lookup and map fields added.
- User page branch map, branch selection, Google Maps link, route toggle, and reach-time estimate added.
- Word project report updated with queue workflow changes.

## Todo Tree

- Frontend
  - Verify full production build on a clean machine or CI.
  - Test profile Industry Settings for every industry type.
  - Test branch map selection and travel estimate on mobile and desktop.
  - Confirm role labels refresh immediately after saving settings.
  - Improve mobile table spacing for queue history if needed.

- Backend
  - Move production database from SQLite to Postgres for persistent Render data.
  - Add automated tests for token cancel, customer-in, and allocation flow.
  - Add validation tests for industry settings role labels.

- Documentation
  - Keep `README.md` updated after deployment changes.
  - Keep `doc/word/AI_Queue_App_Project_Report.docx` aligned with implemented features.
  - Add screenshots after final deployment verification.

- Deployment
  - Redeploy Render backend after pushing changes.
  - Run GitHub Pages workflow after frontend changes are pushed.
  - Confirm CORS and cookies work from `https://mr-asmath.github.io/AI_QUEUE_APP`.
