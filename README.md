# Kawiarniani Artyści

Booking platform connecting cafés/restaurants with creative-workshop artists (painting, ebru, improv, aromatherapy, etc.) for private group events in Poznań, Poland. Clients pick a venue + a workshop (or an artist who travels to them), pick a date/headcount, and send a booking inquiry — the platform then coordinates artist ↔ restaurant ↔ client by email.

**Live:** https://www.kawiarnianiartysci.pl — launched 2026-08-22, after a full manual QA pass across every mode/path and a real end-to-end inquiry (client submission → artist accept → restaurant confirm, all emails delivered) confirmed working by the site owner.

## Tech stack

- **Frontend:** React 18 + Vite, no router/state library — a single main component tree in [`src/App.jsx`](src/App.jsx) (~2,300 lines; see [CONTRIBUTING.md](CONTRIBUTING.md) for why it's one file and how it's organized).
- **Backend:** Vercel serverless functions in [`api/`](api/) (no separate server/database) — handle the booking-inquiry email flow via [Resend](https://resend.com).
- **Data:** restaurants/workshops are **not** in the codebase — they're fetched at runtime from a Google Sheet published as CSV, so the site owner can add/edit listings without a code change. See [CONTRIBUTING.md](CONTRIBUTING.md#data-model--google-sheets-cms).
- **Hosting:** Vercel, auto-deploys on every push to `main`. Domain DNS is on Hostinger, pointed at Vercel.

## Getting started

```bash
npm install
npm run dev      # Vite dev server — the site itself works fully (data comes live from the published Sheet)
npm run build    # production build
```

The frontend works locally with **no environment variables** — it only needs them for the backend inquiry-email flow, which runs as Vercel functions (`vercel dev`, or just push and test against a preview deployment). Required vars, all set in Vercel → Project Settings → Environment Variables:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key that sends the booking-inquiry emails |
| `RESEND_FROM_EMAIL` | Sender address (`zapytania@kawiarnianiartysci.pl`) |
| `INQUIRY_SIGNING_SECRET` | HMAC secret signing the accept/decline/confirm links emailed to artists & restaurants |
| `OWNER_EMAIL` | Address that gets a copy of every inquiry/status change |
| `SITE_URL` | `https://www.kawiarnianiartysci.pl` — used to build absolute links in emails |

⚠️ Changing an env var's value in the Vercel dashboard does **not** affect already-deployed functions — trigger a new deployment (any push) afterward.

## Project structure

```
src/App.jsx        single-file React app — UI, wizard flow, CSV parsing, all in one place
api/                Vercel serverless functions (inquiry email chain)
  _shared.js        HMAC payload signing/verification, shared HTML email templates
  inquiry.js        POST — client submits the booking form → emails artist/restaurant/owner
  respond.js        GET  — artist clicks accept/decline/propose-other-dates link
  confirm.js        GET  — restaurant clicks its own confirm/cancel link (after artist accepts)
public/images/      all photos/logos (see CONTRIBUTING.md for size conventions)
public/fonts/       self-hosted webfont
docs/superpowers/   spec + implementation plan for the "Eventy dla dzieci" (kids mode) feature — a real worked example of the planning docs this codebase uses for larger features
```

## Who to ask

Site owner: Joanna (contact via the platform's own "Kim jesteśmy" email link). Not a technical background — expect to explain changes in plain terms, and expect the Google Sheet (not code) to be the answer to most "can you change X" data questions. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full list of conventions and known gotchas before making changes.
