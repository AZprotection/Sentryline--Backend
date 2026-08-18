# Sentryline API

A real backend for the Sentryline patrol app: Postgres schema, JWT auth,
and working email/SMS delivery hooks. This replaces the in-browser demo
state (which resets on every page reload) with data that actually persists.

Tested in `test/smoke.js` end-to-end against a real Express server and a
Postgres-compatible engine — login, checkpoint scanning, clock in/out with
required verification photo, breaks, incident filing with attachments,
visitor check-in, activity notes, and report sending all run for real.

## Multi-guard fleet & live tracking

This backend supports a real multi-guard fleet, not just one guard at a time:

- **`POST /shifts/location`** — each guard's app pings their GPS position every ~15s while on shift. Stored on their open shift record.
- **`GET /fleet/active`** — every guard currently clocked on or on break, with their last known location and today's real checkpoint progress. Powers the Command Portal's live map and guard status list.
- **`GET /fleet/stream`** — a Server-Sent Events connection. Every checkpoint scan, clock in/out, break, incident, and SOS on the site pushes an event here in real time, so a dispatcher's screen updates without polling. Verified end-to-end in `test/smoke.js` — one guard's location ping is genuinely received live by another guard's open connection.
- **`POST /sos/trigger`** and **`POST /sos/clear`** — emergency alerts, broadcast live to the fleet stream the moment they're triggered.

**Scaling note:** the live stream uses an in-memory pub-sub (`src/pubsub.js`), which works correctly for a single Node process — the default for Render/Railway/Fly.io's standard deployment. If you later scale to multiple instances behind a load balancer, swap that file for a Redis pub-sub adapter (e.g. `ioredis`) so events reach dispatchers connected to a different instance than the one that received the update. The publish/subscribe call sites elsewhere in the code don't need to change either way.

**Deployment note:** Server-Sent Events need a long-lived connection. Render and Railway support this out of the box. If you put a CDN or aggressive reverse proxy in front (e.g. some Cloudflare configurations), make sure streaming responses aren't buffered — the route already sets `X-Accel-Buffering: no` and disables caching to help with this.

## Verifying it works without a real database yet

```bash
npm install
node test/smoke.js
```

This spins up the real Express app against an in-memory Postgres-compatible
engine and walks through login, checkpoint scanning, clock-in/out with
required verification photo, breaks, filing an incident with an
attachment, visitor check-in, an activity note, and report sending. Useful
to confirm your local setup is sane before pointing it at a real database.

## 1. Get a Postgres database (5 minutes)

Pick one:
- **Supabase** (supabase.com) — free tier, gives you a `DATABASE_URL` immediately under Project Settings → Database.
- **Render** (render.com) — "New +" → "PostgreSQL", free tier available.
- **Railway** (railway.app) — one-click Postgres, free trial credit.
- **Neon** (neon.tech) — serverless Postgres, generous free tier.

Copy the connection string it gives you.

## 2. Configure

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — from step 1
- `JWT_SECRET` — run `openssl rand -hex 32` and paste the output
- `RESEND_API_KEY` / `EMAIL_FROM` — optional at first; leave blank and emails just log to the console instead of sending
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` — same, optional at first

## 3. Install, migrate, seed

```bash
npm install
npm run migrate   # applies sql/schema.sql to your database
npm run seed      # creates a demo site, two guards, an admin, and checkpoints
```

The seed script prints the login badge numbers and password (`patrol123`) for the demo guards.

## 4. Run it

```bash
npm start          # production
npm run dev        # auto-restarts on file changes
```

The API listens on `PORT` (default `4000`). Check `GET /health`.

## 5. Point the frontend at this API

The `sentryline-pwa` app now has real API wiring built in — see `api.js`
in that package. Open it and set:

```js
const API_BASE_URL = 'https://your-deployed-backend.onrender.com';
```

Leave it as an empty string and the app runs entirely in local demo mode
(nothing persists, exactly like before). Once set, the app requires
login (use the badge numbers and password printed by `npm run seed`) and
every action — checkpoint scans, clock in/out, breaks, incidents with
attachments, visitor check-in, activity notes, messages, and sending
reports — writes to and reads from this backend for real.

Not yet wired to the backend (still local demo data only): the activity
heat map, training compliance widget, zone/sensor access control, and the
weekly incident trend chart. Those don't have matching backend endpoints
yet — say the word if you want those built out next.

## 6. Turn on real email and text delivery

- **Email**: sign up at resend.com, verify a sending domain (or use their
  test domain while developing), generate an API key, set `RESEND_API_KEY`
  and `EMAIL_FROM`.
- **SMS**: sign up at twilio.com, buy a phone number, copy the Account SID
  and Auth Token from the console, set `TWILIO_ACCOUNT_SID`,
  `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.

Until those are set, `POST /reports/send` still works — it logs what
*would* have been sent instead of failing, so you can develop and demo
without paying for either service yet.

## 7. Deploy the API itself

**See `DEPLOY.md` in this folder for exact, numbered steps** — pushing to
GitHub, deploying the included `render.yaml` blueprint (which provisions
both the API and a Postgres database in one step), seeding demo data
against the live database, and wiring up real Resend/Twilio keys.

Any Node host works if you'd rather not use Render — Railway and Fly.io
are both one-click/one-command from a repo — but `render.yaml` only
covers Render's exact setup.

Point your frontend's `API_BASE_URL` (in `api.js`) at whatever domain the
host gives you.

## Data model

See `sql/schema.sql`. Key tables: `sites` (multi-tenant — each client site
is isolated), `users` (guards/admins/clients, one badge or email + password
each — create new ones via `POST /users`, no database access needed),
`checkpoints` (unlimited per site), `checkpoint_scans` (one row per
tour cycle — this is the tour history), `shifts` + `breaks` (time &
attendance), `incidents` + `attachments`, `visitors`, `activity_log_entries`
(the Daily Activity Report), `sensors`/`zones` (access control),
`geofences` + `geofence_events` (virtual perimeters and violations —
see "Geofencing" below), `passdowns` (shift handover notes), and
`client_contacts`/`client_reports` (who gets nightly summaries, and a
record of every one sent).

## Onboarding a new guard

Once deployed, don't touch the database directly to add guards — log in
as an admin (the seeded `admin@example.com` account, or any account with
`role: "ADMIN"`) and use the Team tab in the Command Portal, or call the
API directly:

```
POST /users
{ "name": "Jane Rivera", "badgeNumber": "GS-3001", "password": "at-least-8-chars", "role": "GUARD" }
```

Removing someone (`DELETE /users/:id`) deactivates them rather than
deleting their row — their shift history, incidents, and activity log
entries all stay intact for record-keeping.

## Geofencing

Geofences are circles — a center point (latitude/longitude) and a radius
in meters — marked either `authorized` (violation if a guard leaves it)
or `restricted` (violation if a guard enters it). This covers the large
majority of real "stay on this lot" / "stay out of that building" cases
without the complexity of arbitrary polygon boundaries.

Violations are detected on every location ping (`POST /shifts/location`,
which the guard app sends every ~15s while on shift) and pushed live to
the Command Portal over the same SSE stream used for fleet tracking —
verified with real coordinates in testing: a guard 200m from a geofence's
center correctly triggers nothing, walking into a 50m-radius restricted
zone correctly fires `entered_restricted`, and walking outside a
500m-radius authorized zone correctly fires `exited_authorized`.

Containment state (which geofences each guard is currently inside) is
tracked in memory (`src/services/geofence.js`), same caveat as the
pub-sub: fine for a single process, would need a shared store (Redis) if
you scale to multiple instances.

## Production hardening — status

- ✅ **Object storage for attachments** — `src/services/storage.js` +
  `POST /uploads/presign`. Set the `STORAGE_*` env vars to turn it on;
  without them, attachments fall back to base64-in-Postgres (fine for a
  small pilot, not for real volume).
- ✅ **Rate limiting on `/auth/login`** — 20 attempts per 15 minutes per IP.
- ✅ **Error tracking** — `src/services/errorTracking.js`. Set `SENTRY_DSN`
  to get real alerts; without it, errors still log to the console.
- ✅ **Request logging** — every request logs method/path/status/duration.
- ✅ **Consent capture for GPS/photo tracking** — see `COMPLIANCE.md`. The
  disclosure text itself still needs a lawyer's review before real use.
- ✅ **Validated against real Postgres**, not just the test suite's
  in-memory engine — every route, including the four queries the test
  engine couldn't run (`json_build_object`, `date_trunc`, week intervals,
  `current_date`), confirmed working against actual Postgres 16.
- ⬜ **Field-tested on real phones** — see `PILOT_TESTING.md`. This one
  genuinely can't be done by an AI; it needs real guards, real phones,
  real cell coverage.
- ⬜ Refresh tokens instead of one 12-hour JWT.
- ⬜ A background job (or Twilio/Resend webhook) to retry failed sends.
- ⬜ Automated database backups — check what your hosting plan includes
  by default (Render's paid Postgres plans include daily backups) before
  assuming you need to build this yourself.
