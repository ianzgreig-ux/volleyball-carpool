# Cloudflare deployment

This app is connected to the volleyball-carpool Cloudflare Worker.

Build command: `npm run build`

Deploy command: `npm run db:migrate && npm run deploy`

Production branch: `main`

D1 binding: `DB`

Set `SPROCKET_FEED_URL` as a private Worker runtime secret before verifying the schedule. Transfer and verify existing shared data before directing parents to the new site.
