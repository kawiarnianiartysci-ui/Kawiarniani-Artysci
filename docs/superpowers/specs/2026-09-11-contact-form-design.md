# Contact Form Feature — Design Spec

**Date:** 2026-09-11  
**Feature:** Add a contact/feedback form to the platform  
**Scope:** HomeScreen only, via footer  
**Status:** Design approved

---

## Overview

Add a simple contact form allowing users to send feedback or general inquiries directly to the platform owner (Joanna). The form is accessible from the footer on the home screen and sends messages via email using the existing Resend infrastructure.

**User goal:** "I have questions about the platform or feedback — I want an easy way to reach the platform owner."

**Success criteria:**
- Contact form is visible in HomeScreen footer
- User can submit email + message
- Message arrives to Joanna's inbox via email
- User sees confirmation ("Dziękujemy! Otrzymaliśmy Twoją wiadomość, odpowiemy najszybciej jak potrafimy")

---

## UI & UX

### HomeScreen Footer

**Location:** Bottom of `HomeScreen` component, after all other content (PathTiles, PartnerLogosBar, etc.)

**Footer content:**
- Simple link/button text: **"Skontaktuj się z nami"** (or styled as a tile to match the design language, depending on preference)
- Clickable → opens `ContactModal`

**Design notes:**
- Keep footer minimal — just this one link, no other clutter
- Use existing design tokens (brown primary `#432A16`, spacing, typography)
- Visible only on HomeScreen (not in kids mode, not in wizard, not in b2b)

### ContactModal

**Structure:**
```
┌─────────────────────────────────┐
│  Skontaktuj się z nami          │ (title)
├─────────────────────────────────┤
│                                 │
│  Masz pytania o działanie       │ (help text)
│  platformy, uwagi czy jak       │
│  możemy ci pomóc, napisz do nas │
│  postaramy się odpowiedziec     │
│  jaknajszybciej...              │
│                                 │
│  Email: [____________]          │
│  Wiadomość: [_________]         │
│             [_________]         │
│                                 │
│  [Wyślij] [Anuluj]              │
└─────────────────────────────────┘
```

**Fields:**
- **Email** — required, `<input type="email">`, placeholder: "Twój email"
- **Wiadomość** — required, `<textarea>`, placeholder: "Twoja wiadomość", ~4-5 rows
- **Buttons:** "Wyślij" (primary action, brown), "Anuluj" or close button

**Behavior:**
- Form opens in a modal (similar to existing `ProfileModal`)
- On submit, disable button + show loading state (optional spinner or just opacity change)
- POST to `/api/contact` with `{ email, message }`
- On success: show confirmation message, then close modal
- On error: show error message (e.g., "Nie udało się wysłać. Spróbuj ponownie.")

**Confirmation message:**
```
Dziękujemy! Otrzymaliśmy Twoją wiadomość, 
odpowiemy najszybciej jak potrafimy.
```

---

## Backend (Vercel Function)

### `POST /api/contact`

**Request body:**
```json
{
  "email": "user@example.com",
  "message": "Pytanie o działanie platformy..."
}
```

**Validation:**
- Both fields required
- Email must be valid (basic format check)
- Message should be non-empty

**Response on success:**
```json
{
  "success": true,
  "message": "Message received"
}
```

**Response on error:**
```json
{
  "success": false,
  "error": "Invalid email" | "Message is empty" | "Failed to send"
}
```

**Email sent to:**
- **To:** `OWNER_EMAIL` (Joanna — already set in env vars)
- **From:** `RESEND_FROM_EMAIL` (`zapytania@kawiarnianiartysci.pl`)
- **Subject:** `"Nowa wiadomość ze strony — kontakt"`

**Email template (plain text or simple HTML):**
```
Nowa wiadomość ze strony kawiarnianiartysci.pl

Od: {email}
Wiadomość:
{message}

---
Odpowiedź wysyłaj bezpośrednio na ten adres email.
```

**Implementation notes:**
- Use Resend API (same as `inquiry.js`, `respond.js`, `confirm.js`)
- No database/storage — pure email flow
- No signed URLs needed (unlike booking inquiry chain)
- Reuse email sending logic from `api/_shared.js` or copy inline if simpler

---

## Data Flow

```
User submits form
       ↓
POST /api/contact { email, message }
       ↓
Validate fields
       ↓
Send email via Resend
       ↓
Return success/error to frontend
       ↓
Show confirmation message or error
       ↓
Modal closes (on success)
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.jsx` | Add `ContactModal` component + state to manage modal visibility + footer in `HomeScreen` |
| `api/contact.js` | New file — Vercel function to handle contact form submissions |

---

## Acceptance Criteria

- [ ] Footer visible on HomeScreen
- [ ] Clicking footer link opens ContactModal
- [ ] Email and message fields are required
- [ ] Form submission sends POST to `/api/contact`
- [ ] Email arrives in Joanna's inbox
- [ ] User sees confirmation message
- [ ] Modal closes after confirmation
- [ ] Error handling works (invalid email, network error, etc.)
- [ ] Form is NOT visible on other screens (wizard, kids mode, b2b, etc.)

---

## Out of Scope (For Now)

- Rating/satisfaction survey
- Categorizing feedback by type
- Admin dashboard to view submissions
- Multi-language support (Polish only for now)
- Spam protection (reCAPTCHA, etc.) — can be added later if needed

