# Contributing / developer notes

This doc exists because the site has been built and maintained through many short, incremental AI-assisted sessions rather than a from-scratch spec — a lot of hard-won context (why things are shaped the way they are, real bugs already found and fixed) lives outside the code. Read this before making non-trivial changes; several "obvious improvements" here were already tried and explicitly reverted by the site owner.

## Why one giant `src/App.jsx`

No router, no global state library, no component-per-file split. This was a deliberate choice for how this project has been developed (frequent small AI-assisted edits where a single browsable file beats hunting across many small ones) — not an accident of growth. If you split it up, that's a legitimate call for a human-maintained codebase going forward, just know it's a real architecture change, not a cleanup. Rough map of what's in there, top to bottom: image path constants → CSV parsing (`parseCSV`, `csvToObjects`, `restaurantFromRow`/`workshopFromRow`) → small reusable components (icons, `PhotoGallery`, `ProfileModal`, `RestaurantCard`/`WorkshopCard`) → the three top-level screens (`HomeScreen`, `KidsHomeScreen`, `PartnersView`) → the booking wizard (`PickStep`, `Step4ContactForm`, `WizardStickyBar`) → the root `App()` component wiring state/routing-by-hand together.

## Data model — Google Sheets CMS

Restaurants and workshops are **not hardcoded** — `App.jsx` fetches two CSVs at runtime from a Google Sheet ("dane na stronie o restauracjach i warsztatach") published via **File → Share → Publish to web**, one per tab:

- `CSV_RESTAURANTS_URL` — tab **„restauracje"**
- `CSV_WORKSHOPS_URL` — tab **„warsztaty"**

Both constants live near the top of `App.jsx`. This is why "add a restaurant" or "change a price" is almost always a **Sheet edit, not a code change** — check there first before touching `App.jsx` for anything that looks like content rather than behavior.

### Column reference (restauracje)
`id,email,comingSoon,name,tagline,logo,photos,vibe,location,description,fullDescription,capacity,minPeople,maxPeople,address,website,instagram,instagramUrl,facebookUrl,hours,gradientBg,gradientText,variants,hasSeparateRoom,requiresInvoice,acceptsKids,kidsVariants`

### Column reference (warsztaty)
`id,comingSoon,name,logo,photo,photos,artist,bio,duration,pricePerPerson,minPeople,maxPeople,description,includes,website,instagram,instagramUrl,facebookUrl,email,gradientBg,gradientText,requiresSeparateRoom,invoicing,requirements,canInvoice,forKids,kidsMinAge,travelsToClient,travelArea`

Notes:
- **Column headers are matched by exact name**, case-sensitive (`csvToObjects` maps CSV headers straight to object keys) — order in the sheet doesn't matter, a typo'd header silently parses as `undefined` with no error. If a field "isn't working," check the exact header spelling first via a raw `curl` of the published CSV URL before assuming a code bug.
- `gradientBg`/`gradientText` are dead — still present as columns, unused in code. Don't bother filling them for new rows.
- Booleans (`comingSoon`, `hasSeparateRoom`, `requiresInvoice`, etc.) accept `TRUE`/`FALSE`/`1`/`tak`/`prawda` (Google Sheets sometimes auto-localizes to Polish). `canInvoice`/`travelsToClient` are **tri-state** (`toTriBool`) — blank means "unknown, don't exclude," only an explicit `FALSE`/`nie` triggers filtering. Everything else collapses blank and false together.
- `photo`/`logo`: a bare filename living in `public/images/` (no path, no leading slash — the parser prepends `/images/`).
- `photos` (gallery): comma-separated filenames. A photo can carry a display modifier: `filename@position=center 15%` or `filename@fit=contain`.
- `hours`: one cell, `pon=13:00-22:00;wt=10:00-20:00;sr=;...` (Polish day keys `pon,wt,sr,czw,pt,sob,nd`, empty range = closed). **Must match this exact syntax** — free text like `"13:00 - 22:00"` silently parses into a bogus day key that makes the row vanish from every date-filtered listing, with no error anywhere.
- `variants`/`kidsVariants` (pricing tiers): semicolon-separated groups, each `id|label|detail|price|priceMax` (`priceMax` optional, an empty `price` renders as "cena do ustalenia" — a supported state, not a bug).
- `includes`: semicolon-separated, **must be one physical line** — a pasted multi-line blob with embedded newlines merges into one garbled bullet on the live site.
- A restaurant row with **zero `variants`** (only `kidsVariants` filled) is treated as "kids-mode only" and excluded from the normal adult flow — no separate flag column, this is the actual convention (see `compatibleRestaurants` in `App.jsx`).
- New-partner intake mostly flows through Google Forms → Apps Script → staging tabs (`"restauracje - do weryfikacji"`/`"warsztaty - do weryfikacji"` in the same spreadsheet) rather than typing a new row by hand — see the Apps Script projects bound to each Form (Form → ⋮ → Edytor skryptów; **not** reachable from the Sheet's own Rozszerzenia menu, that container is empty). Photos always need manual download-and-reupload regardless of intake path.

## Images

`public/images/` + `public/fonts/`, referenced by short path constants at the top of `App.jsx` (`const HERO_PHOTO = "/images/hero-photo.jpg"`). New uploads: via the GitHub web UI (drag & drop → commits straight to `main`) or `git push` directly, then reference the exact filename in the relevant Sheet row.

- **Target size**: ≤~1200px on the long side for profile/gallery photos (~300px for logos), JPEG not PNG, ~100-300KB — most images here are shown as small thumbnails (72-420px), so anything larger is pure waste. A full weight-audit in August 2026 found several multi-MB full-camera-resolution photos being served for tiny thumbnails; total folder weight went 42.3MB → 8.5MB after resizing. [Squoosh.app](https://squoosh.app) (browser-based, no install) works well: MozJPEG, resize, quality 75-80.
- Every `<img>` in the app has `loading="lazy"` except the always-visible header logo — keep this on any new image you add, it materially affects load time on profile modals with several photos.
- **Filename gotcha**: manual GitHub-web-UI uploads have repeatedly landed under a mismatched filename (a stray double extension like `photo.jpg.jpg`, or the wrong extension entirely, e.g. uploading a `.jpg` when the Sheet still says `.png`) — the old, heavy file silently keeps being the one actually served, since the Sheet/code still points at the original exact name. `git diff --stat` between two upload commits shows this clearly: a genuine same-name overwrite reads as `Bin XXXXXX -> Bin YYYYYY`; a new filename appearing *alongside* an unchanged old one is the mismatch. Fix by renaming to the exact filename the Sheet/code expects (no Sheet edit needed) or, if the extension itself is wrong, editing the one Sheet cell.
- Clean, URL-safe filenames only (kebab-case, no spaces, no Polish diacritics) — raw phone-export names (`WhatsApp Image ...jpeg`, `IMG-2026...jpg`) get renamed on upload.

## Booking flow architecture

Three top-level modes in `App()`: `mode` = `"client" | "b2b" | "kids"`. The client/kids modes share one wizard skeleton (`PathTiles` → `PickStep` → `Step4ContactForm`) via a `kidsMode` boolean prop threaded through shared components, rather than duplicated component trees — kids-mode restaurant pricing reuses the exact same rendering code via a pure view-model swap (`toKidsRestaurantView(r) = {...r, variants: r.kidsVariants}`).

`path` (`null | "workshop" | "restaurant" | "ownplace"`) picks which flow: book a restaurant + workshop together, or — the **"Mam miejsce"** path — invite an eligible artist (`travelsToClient=tak` in the Sheet) to the client's own address, no restaurant involved at all. This is a **top-level tile**, not a nested toggle — an earlier nested-in-step-2 version tested badly (the site owner couldn't find it) and was corrected same-day.

Compatibility between a chosen restaurant and workshop (separate room requirement, invoice capability, opening hours vs. selected date/time, headcount range) is **silent filtering** — an incompatible option simply never appears in the list, no warning message shown. This is a deliberate, repeatedly-confirmed choice, not a missing feature.

## Email backend (Resend)

`POST /api/inquiry` (client submits) → emails the artist (with signed accept/decline/propose-other-dates links), the restaurant (informational, skipped silently if it has no `email` column value), and the owner (copy of everything). `GET /api/respond` (artist clicks a link) → for accept, fires a second signed link to the restaurant; `GET /api/confirm` (restaurant clicks its own link) → finalizes and notifies everyone. All three share one HMAC payload scheme in `api/_shared.js` (`signPayload`/`verifyAndDecode`) so state travels entirely inside signed URLs — there's no database. Kids-event fields ride inside the same payload, additively (empty when not a kids booking).

## Design conventions

Settled through many iteration rounds — apply by default to new UI rather than re-deriving a style:

- No arrows (→/←) on filled/rounded "tile" buttons (CTAs, wizard nav, form submit). Plain underlined text links ("Zobacz profil →") keep the arrow — different pattern, not an inconsistency.
- Active/selected state on **segment/filter-bar selectors**: a subtle 1px brown border (`C.primary`, `#432A16`), no fill. On **card-style tiles** (`RestaurantCard`, `WorkshopCard`, `PathTiles`): a light cream tint (`C.selectedBg`) *plus* the border — both count as "in convention," they're just two different component shapes.
- Brown (`#432A16`) is the one primary action color — don't add a second accent without a real reason.
- Center text on equally-sized tiles; a filter/field with no value renders blank, never a placeholder word like "Dowolne".
- Multi-segment bars collapse to a single column on narrow screens via a real CSS media query on a shared class — not by letting a flex row wrap unpredictably (caused a real overlap bug once).

## Deploy workflow

Push to `main` → Vercel auto-builds and deploys, typically live within 1-2 minutes. There's currently no branch/PR process — every change (from both the site owner and AI-assisted sessions) has gone straight to `main` on a real, actively-booked-through production site. If you're joining as an external developer, discuss with Joanna whether to keep that or move to a PR-based workflow before making structural changes — it's a deliberate choice so far, not an oversight, but worth revisiting once more than one person is touching the code regularly.
