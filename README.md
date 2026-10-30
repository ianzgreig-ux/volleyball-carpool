# Volleyball Carpool
Shared practice calendar and drop-off/pickup planning for four families. Includes a monthly calendar, past practice archive and assignment change log.

Worker: volleyball-carpool. D1 binding: DB.
Set SPROCKET_FEED_URL as a Worker secret to the private Sprocket subscription URL. Never commit that URL or database exports.
Build: npm install && npm run build
Deploy: npm run db:migrate && npm run deploy

Before switching users, transfer the existing family records, assignments and change logs into D1 and verify them. Source code does not contain live data. Keep the original site active until migration is verified.
The app permits anyone with its link to edit the shared carpool. No individual logins or notifications.

Player attendance: each practice has four attendance checkboxes. Uncheck a player to mark them as not attending and needing no rides for that practice. Attendance is shared and logged. Rechecking restores attendance. Driver assignments remain independent because parents may still drive other players. Practices with no attending players require no drivers and are excluded from journeys to assign. Version 1.3.0 adds migration 0004 for the absences table; apply migrations before deploying.

Trip updates (v1.7.0): pickup time, meeting place and note are saved per practice and direction. Live statuses are available on the practice day, with 5/10/15-minute pickup estimates. Changing the assigned driver resets status and ETA while retaining the pickup plan. The app remains shared-link access, with no driver identity verification. Native sharing opens a chooser; the parent selects their existing group and sends. Clipboard fallback does not send messages. No live location or automatic SMS is used.

Migration 0005 adds ride_updates. Startup also creates this table idempotently so existing Cloudflare deploy commands remain compatible; it does not alter existing assignments. Run `npm test` for SQLite-backed journey validation, persistence and reassignment checks.
