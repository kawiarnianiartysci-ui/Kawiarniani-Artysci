# Contributing / developer notes

This doc exists because the site has been built and maintained through many short, incremental AI-assisted sessions rather than a from-scratch spec — a lot of hard-won context (why things are shaped the way they are, real bugs already found and fixed) lives outside the code. Read this before making non-trivial changes; several "obvious improvements" here were already tried and explicitly reverted by the site owner.

## Why one giant `src/App.jsx`

No router, no global state library, no component-per-file split. This was a deliberate choice for how this project has been developed (frequent small AI-assisted edits where a single browsable file beats hunting across many small ones) — not an accident of growth. If you split it up, that's a legitimate call for a human-maintained codebase going forward, just know it's a real architecture change, not a cleanup. Rough map of what's in there, top to bottom: image path constants → CSV parsing (`parseCSV`, `csvToObjects`, `restaurantFromRow`/`workshopFromRow`) → small reusable components (icons, `PhotoGallery`, `ProfileModal`, `RestaurantCard`/`WorkshopCard`) → the three top-level screens (`HomeScreen`, `KidsHomeScreen`, `PartnersView`) → the booking wizard (`PickStep`, `Step4ContactForm`, `WizardStickyBar`) → the root `App()` component wiring state/routing-by-hand together.

## Data model — Google Sheets CMS

Restaurants and workshops are **not hardcoded** — `App.jsx` fetches two CSVs at runtime from a Google Sheet ("dane na stronie o restauracjach i warsztatach") published via **File → Share → Publish to web**, one per tab:

- `CSV_RESTAURANTS_URL` — tab **„restauracje"**
- `CSV_WORKSHOPS_URL` — tab **„warsztaty"**

Both constants (plus the CSV parser and `restaurantFromRow`/`workshopFromRow`) live in [`src/dane.js`](src/dane.js) since 2026-09 — shared by the browser app and the serverless functions in `api/`, so both always read the Sheet identically. This is why "add a restaurant" or "change a price" is almost always a **Sheet edit, not a code change** — check there first before touching `App.jsx` for anything that looks like content rather than behavior.

### Column reference (restauracje)
`id,email,comingSoon,name,tagline,logo,photos,vibe,location,description,fullDescription,capacity,minPeople,maxPeople,address,website,instagram,instagramUrl,facebookUrl,hours,gradientBg,gradientText,variants,hasSeparateRoom,requiresInvoice,acceptsKids,kidsVariants`

### Column reference (warsztaty)
`id,comingSoon,name,logo,photo,photos,artist,bio,duration,pricePerPerson,minPeople,maxPeople,description,includes,website,instagram,instagramUrl,facebookUrl,email,gradientBg,gradientText,requiresSeparateRoom,invoicing,requirements,canInvoice,forKids,kidsMinAge,travelsToClient,travelArea`

Notes:
- **Column headers are matched by exact name**, case-sensitive (`csvToObjects` maps CSV headers straight to object keys) — order in the sheet doesn't matter, a typo'd header silently parses as `undefined` with no error. If a field "isn't working," check the exact header spelling first via a raw `curl` of the published CSV URL before assuming a code bug.
- `slug` (optional, both tabs, added 2026-09): the ending of the item's public profile URL (`/warsztaty/<slug>`, `/miejsca/<slug>`). Blank → auto-generated from `id` via `slugify()` in `src/dane.js` (lowercase, Polish chars stripped, anything else → `-`). Whatever is typed is also run through `slugify`, so a capital letter or space can't break a URL. **Changing a slug later breaks links already shared** — old id-based URLs redirect (301) to the slug, but an old *slug* does not.
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
- **Automatic resizing (since 2026-09-29):** every content `<img>` goes through `optimizedImg(src, width)` in `App.jsx`, which points it at Vercel Image Optimization (`/_vercel/image?url=…&w=…&q=75`, WebP). Allowed widths must match `images.sizes` in `vercel.json` (256/640/1080). An `onError` handler falls back to the original file, so if optimization ever fails (e.g. Hobby-plan limit) images still show. Keep using `optimizedImg` for any new image; source files should still follow the size guidance above. `og:image` in `api/page.js` deliberately stays the original file.

## Performance notes (2026-09-29)

PageSpeed mobile after this round: profile page 56 → **88** (LCP 12.4 s → 3.1 s, CLS 0.34 → 0), homepage **68** (was unmeasurable before), SEO 100 on both. What mattered, and what not to undo:
- **Hero video** is `public/videos/hero.mp4` (3.2 MB, 1280×720, 6.4 s, trimmed by Joanna in Canva → `HERO_VIDEO_START = 0`). The old `hero.mov` (12.9 MB) is still in the repo only as a backup and is not referenced.
- **Deep link to a profile must not render the homepage first.** `App()` computes `initialProfile` from the embedded Sheet data on the very first render (path + profile set in `useState` initialisers); otherwise the homepage hero video starts downloading (~13 MB) before the modal opens.
- **Plain-HTML SEO content** from `api/page.js` sits in `#seo-tresc` and is hidden for JS users (`.js #seo-tresc{display:none}`, 8 s fallback) — showing it and then swapping to the React view caused big layout shift. Its `<img>` tags are `loading="lazy"` so hidden images don't download.
- **Google Fonts stylesheet stays a normal, render-blocking `<link>` in `index.html`.** Loading it async (`media="print" onload`) was tried and reverted: no FCP gain, CLS jumped to 0.37 from the font swap.
- **Thin dark line under the hero video** is a Chrome video-layer artifact (the video paints past `overflow:hidden`/`clip-path`). The only fix that worked: a 12px `C.bg` strip placed *after* the hero container (`zIndex:1`, `marginTop:-4`, `marginBottom:-8`). The video enlargement also uses width/height 115% + offsets instead of `transform: scale`.
- Remaining, deliberately left: homepage CLS ~0.11 (source not yet pinned down — likely the partner-logo bar or the "Wczytywanie…" → content swap) and homepage LCP ~6.8 s (the hero video on throttled 4G; replacing it with a photo on phones would be a design decision for the owner).

## Booking flow architecture

Three top-level modes in `App()`: `mode` = `"client" | "b2b" | "kids"`. The client/kids modes share one wizard skeleton (`PathTiles` → `PickStep` → `Step4ContactForm`) via a `kidsMode` boolean prop threaded through shared components, rather than duplicated component trees — kids-mode restaurant pricing reuses the exact same rendering code via a pure view-model swap (`toKidsRestaurantView(r) = {...r, variants: r.kidsVariants}`).

`path` (`null | "workshop" | "restaurant" | "ownplace"`) picks which flow: book a restaurant + workshop together, or — the **"Mam miejsce"** path — invite an eligible artist (`travelsToClient=tak` in the Sheet) to the client's own address, no restaurant involved at all. This is a **top-level tile**, not a nested toggle — an earlier nested-in-step-2 version tested badly (the site owner couldn't find it) and was corrected same-day.

Compatibility between a chosen restaurant and workshop (separate room requirement, invoice capability, opening hours vs. selected date/time, headcount range) is **silent filtering** — an incompatible option simply never appears in the list, no warning message shown. This is a deliberate, repeatedly-confirmed choice, not a missing feature.

### Gotchas already found and fixed here (don't reintroduce)

- **Mode-switch state leak via the header logo / browser back button.** `App()` tracks the last wizard mode (`"client"`/`"kids"`, deliberately excluding `"b2b"`) in a ref (`lastWizardModeRef`) so switching client↔kids always resets the wizard, but a detour through `"b2b"` doesn't. The header's client/kids buttons go through `goWizardMode()`, which keeps the ref in sync — but the logo (`setMode("client")` + unconditional `resetToHome()`) and the `popstate` handler (browser back/forward) both set `mode` directly, bypassing that. A `useEffect` syncing `lastWizardModeRef.current = mode` whenever `mode` is `"client"`/`"kids"` (never for `"b2b"`) closes this for every current and future code path that touches `mode` — if you add another way to change `mode`, it's covered automatically, no extra wiring needed.
- **`Step4ContactForm`'s "zmień" links used hardcoded step numbers** (`Warsztat` → step 1, `Miejsce` → step 2) — wrong for clients who start from "Wybierz restaurację/kawiarnię" instead of "Wybierz warsztat", where step 1 shows the *restaurant* list, not the workshop list. Fixed by passing `workshopStep`/`placeStep` down from `App()` (computed from `step1Kind`, which already knows the actual order) instead of hardcoding. If you add a third "top" summary row with its own `step`, compute it the same way — never hardcode a step number in `Step4ContactForm` itself.
- **Copy shared between the restaurant-based flow and the "Mam miejsce" flow can silently lie.** `WorkshopCard`'s "wymaga osobnej sali" note used to always say "na kolejnym kroku pokażemy miejsca, które ją mają" — false for `ownPlace`, where step 2 is `PlaceInterviewForm` (asks the client about their own space), not a restaurant list. Now branches on an `ownPlace` prop threaded through `PickStep`. Worth checking any other copy shared across `path` values before assuming it's context-free.

### Client Terms (Regulamin)

`CLIENT_TERMS_SECTIONS` + `ClientTermsModal` in `App.jsx` render the site's terms-of-service for clients (source: `Regulamin_Klienci_KawiarnianiArtysci_prawomocny_2026 08 22.docx`, effective 2026-08-22 — same `{title, items}` array shape as the pre-existing `PARTNER_TERMS_SECTIONS`/`PartnerTermsModal` for b2b partners, a different document for a different audience, don't conflate them). A required checkbox ("Zapoznałem/-am się i akceptuję Regulamin Platformy") sits in `Step4ContactForm` next to the RODO-consent checkbox — since that component is the one shared final step across client/kids/"Mam miejsce", it covers every submission path. Also linked from `Footer` next to "Polityka prywatności". If the source document's numbering ever needs to change again (it was renumbered once already, from a source that skipped § 4), update every in-text cross-reference too (`grep -n '§' src/App.jsx` inside `CLIENT_TERMS_SECTIONS`) — they don't auto-renumber, and one reference ("art. 394 § 1 Kodeksu cywilnego") is Civil Code numbering, not this document's own, and must never be touched.

## Email backend (Resend)

`POST /api/inquiry` (client submits) → emails the artist (with signed accept/decline/propose-other-dates links), the restaurant (informational, skipped silently if it has no `email` column value), and the owner (copy of everything). `GET /api/respond` (artist clicks a link) → for accept, fires a second signed link to the restaurant; `GET /api/confirm` (restaurant clicks its own link) → finalizes and notifies everyone. All three share one HMAC payload scheme in `api/_shared.js` (`signPayload`/`verifyAndDecode`) so state travels entirely inside signed URLs — there's no database. Kids-event fields ride inside the same payload, additively (empty when not a kids booking).

Hardening added 2026-09 (don't regress):
- **Partner emails come from the Sheet, never from the browser.** The client sends only `restaurantId`/`workshopId`; `api/inquiry.js` looks the rows up server-side (`api/_sheet.js`, 5-min in-memory cache). Before this, anyone could POST arbitrary `artistEmail`/`restaurantEmail` and send branded mail to any address. Rows with `comingSoon = TRUE` get no partner mail. If the Sheet fetch fails the owner copy still goes out, with a warning block.
- **All client-typed text is HTML-escaped** (`txt`/`longTxt` in `inquiry.js`, `escapeHtml`/`nl2br` in `contact.js`) before it lands in any email.
- **The owner copy must succeed** or the client gets an error (and can retry); partner mails are best-effort. Every send goes through `sendEmail()` in `_shared.js`.
- **Test mode:** when `VERCEL_ENV !== "production"` (preview deployments), `sendEmail()` redirects *every* mail to `OWNER_EMAIL` with subject `[TEST → original recipient]`, email links point back to the preview host, and production rejects payloads signed in test mode (`test: true`). Preview deployments need their own env vars (Vercel → Settings → Environment Variables → tick **Preview**); the preview `INQUIRY_SIGNING_SECRET` is deliberately a different value than production's. Only branches that contain this code are safe to point at real partner data — an older branch's preview would send real mail.

## Public URLs, share previews & SEO (2026-09)

Every item has its own shareable URL, and a handful of occasion landing pages exist for search:

- `/warsztaty/<slug>`, `/miejsca/<slug>` — open the site with that profile's `ProfileModal` on top of wizard step 1 (kids mode for `kidsOnly` workshops / kids-only restaurants).
- `/wieczor-panienski`, `/urodziny`, `/urodziny-dla-dzieci` (kids mode), `/integracja-firmowa`, `/baby-shower` — `OccasionPage`. Texts live in `OCCASIONS` in [`src/seo.js`](src/seo.js); listings are computed from the Sheet (adults vs. kids only — there is intentionally no per-occasion tag column).
- Anything else → `NotFoundPage` with a real HTTP 404.

**How it works (option "A" from the 2026-09-28 audit):** `vercel.json` rewrites every non-static path to `api/page.js` (static files, `/`, `/assets/*`, `/images/*` are served first). The function takes the built `index.html` — written to `api/_szablon.js` by a small plugin in `vite.config.js` on every build (git-ignored) — replaces the block between `<!-- SEO:START -->`/`<!-- SEO:END -->` with per-page `<title>`, description, canonical, Open Graph/Twitter tags and JSON-LD, drops the `<!-- NOSCRIPT -->` block, puts plain-HTML page content inside `#root` (for crawlers/AI bots that don't run JS; React replaces it on boot), and embeds the Sheet CSV as `window.__DANE_ARKUSZA__` so the app skips its own fetch. CDN-cached `s-maxage=300`, so Sheet edits show within ~5 min. `/sitemap.xml` is `api/sitemap.js` (active rows only). **Don't remove the marker comments in `index.html`.**

Client side, the manual history mechanism was extended rather than replaced with a router: history entries now carry a URL and a `landing` field. Two ordering gotchas already hit (don't reintroduce): (1) the "resolve the initial URL" effect must be declared **after** the pushState effect, otherwise the first render pushes a stray root entry and Back from a deep-linked profile lands on the homepage; (2) the pushState effect skips when state+URL equal the current entry, otherwise deep links need Back twice.

Share row (`ShareButtons`, bottom of `ProfileModal`, small outline icons): Facebook, Instagram, LinkedIn, copy-link, plus a system-share icon on touch devices (covers WhatsApp/Messenger/SMS). Instagram has no web share URL — on touch it opens the system share sheet, on desktop it copies the link with a hint. Fires GA4 `share` (`method`, `content_type`, `item_id`). Share links carry `data-share` so the global `contact_click` tracker ignores them. Links are clean (no UTM) on purpose.

## Blog (2026-10)

Posts are written by Joanna in Google Docs; nothing about a post lives in the repo. Her how-to: [`INSTRUKCJA_BLOG.md`](INSTRUKCJA_BLOG.md). Design/plan: `docs/superpowers/specs/2026-10-03-blog-design.md`, `docs/superpowers/plans/2026-10-03-blog.md`.

- **Index:** Sheet tab **Blog** (published to CSV, `CSV_BLOG_URL` in `src/dane.js`), columns `link`, `data`, `adres`, `okazja`, `opublikowany`. `blogPostFromRow` extracts the doc id (a "Publish to web" `/d/e/…` link is rejected), normalises the date (`2026-10-06` or `6.10.2026`), slugifies `adres`/`okazja`. The doc must be shared "anyone with the link can view".
- **Fetching (`api/_blog.js`):** CSV cached 5 min; each doc cached 3 min per function instance (plus 5 min CDN page cache with stale-while-revalidate), last good version served if Google fails. Lists (`/blog`, occasion-page links, `/api/blog`) use `export?format=txt` (a few KB); only the post page fetches `export?format=html`, which carries images as base64.
- **Parser (`api/_blogDoc.js`, pure, no deps):** whitelist only (headings, p, strong/em from Google's CSS classes, lists, links, images, br, tables). Tables: first row → `<th>`, a cell's paragraphs/list items are joined with `<br>`, nested tables are flattened into the outer cell, colspan/rowspan dropped; styling lives in `.blog-body table` (App.jsx) and inline in `blogPostBody` (api/page.js), with `display:block;overflow-x:auto` so wide tables scroll on phones. First Heading 1 = title (dropped from body, other headings mapped to h2–h4); first paragraph ≥ 6 words after it = intro/description; `[bracketed]` lines are working notes and never become title/intro. `google.com/url?q=` links unwrapped, own-domain links made relative, externals get `target=_blank rel=noopener`. Comment/footnote anchors are skipped and the export is cut at the trailing comments section. A heading starting "Najczęstsze pytania" turns the following lower-level headings + paragraphs into `FAQPage` JSON-LD.
- **Images:** `/blog-img/<adres>/<n>-<640|1080|1200>.<webp|jpg>` → `api/blog-img.js` decodes the base64 and resizes with `sharp`. Post-page image URLs carry a content hash (`<n>-<w>-<imgHash>.<ext>`, FNV-1a of the base64) and are cached `immutable` for a year — a replaced photo gets a new URL, so it shows immediately; a stale hash is still served but with a short cache. The list-tile cover (`0-640.webp`, from the txt export, no hash) is cached 24 h. Image 0 is the cover (list tile 640 webp, `og:image` 1200 jpg) and is `fetchpriority="high"`; the rest are lazy.
- **Pages:** `api/page.js` renders `/blog` and `/blog/<adres>` (plain HTML in `#seo-tresc`, `BlogPosting`/`Blog`/`BreadcrumbList`/`FAQPage` JSON-LD, `og:type=article`) and embeds `window.__BLOG__` (`{list}` / `{post}` without images / `{unavailable}`). Unpublished posts 404 except with `?podglad` (then `noindex`, `no-store`). Occasion pages get `{list}` too and show "Przeczytaj na blogu".
- **React:** blog pages are `landing = { type:"blog", slug, title }`, rendered from `window.__BLOG__` (`BlogListPage`, `BlogPostPage`). Header/footer "Blog" links and links inside posts are plain `<a href>` — a full page load into the server-rendered page, by design. GA4 event `blog_cta_click { post, target }`.
- **Tests:** `tests/blog.test.mjs` (fixture `tests/fixtures/doc-export.html`) runs inside `npm run build`; a failure stops the Vercel deployment. There is no local Node here — check a commit with `curl -s https://api.github.com/repos/kawiarnianiartysci-ui/Kawiarniani-Artysci/commits/<sha>/status`.

## Design conventions

Settled through many iteration rounds — apply by default to new UI rather than re-deriving a style:

- No arrows (→/←) on filled/rounded "tile" buttons (CTAs, wizard nav, form submit). Plain underlined text links ("Zobacz profil →") keep the arrow — different pattern, not an inconsistency.
- Active/selected state on **segment/filter-bar selectors**: a subtle 1px brown border (`C.primary`, `#432A16`), no fill. On **card-style tiles** (`RestaurantCard`, `WorkshopCard`, `PathTiles`): a light cream tint (`C.selectedBg`) *plus* the border — both count as "in convention," they're just two different component shapes.
- Brown (`#432A16`) is the one primary action color — don't add a second accent without a real reason.
- Center text on equally-sized tiles; a filter/field with no value renders blank, never a placeholder word like "Dowolne".
- Multi-segment bars collapse to a single column on narrow screens via a real CSS media query on a shared class — not by letting a flex row wrap unpredictably (caused a real overlap bug once).

## Deploy workflow

Push to `main` → Vercel auto-builds and deploys, typically live within 1-2 minutes. Since 2026-09 larger changes go to a separate branch first: Vercel builds a protected Preview deployment for it, the site owner creates a `_vercel_share` link (deployment → Share) so it can be tested, and it's merged to `main` only after her OK. Emails on previews run in test mode (see Email backend). Before that there was no branch/PR process — every change (from both the site owner and AI-assisted sessions) has gone straight to `main` on a real, actively-booked-through production site. If you're joining as an external developer, discuss with Joanna whether to keep that or move to a PR-based workflow before making structural changes — it's a deliberate choice so far, not an oversight, but worth revisiting once more than one person is touching the code regularly.

**Verifying a deploy went out clean, with no local Node/npm available:** capture the live JS bundle filename (`/assets/index-*.js`, visible in the served HTML's `<script src>`) *before* pushing — a build can go live within 5-10s, fast enough that the very first post-push check can already be reading the new bundle, making a naive "wait for the hash to change" poll hang forever waiting for a change that already happened. Prefer fetching the served bundle directly and grepping it for a string unique to the new code over comparing hashes. A raw `curl` to this domain can get blocked by Vercel's bot-challenge (`Vercel Security Checkpoint`, misleadingly looks like the deploy hasn't landed) — a real browser fetch doesn't trip it.

## Status (2026-09-29)

Live and extended since launch: shareable profile URLs with per-page meta/JSON-LD, 5 occasion landing pages, share buttons, auto-generated sitemap, hardened inquiry emails with a preview test mode, and the performance round above. All 25 Sheet rows have a hand-picked `slug`. Joanna still needs to resubmit `sitemap.xml` in Google Search Console if she hasn't yet.

## Status (2026-08-22)

Launched. Every mode/path (client — both entry orders, kids, "Mam miejsce", each combination) was walked through end-to-end in a manual QA pass immediately before launch, plus one real inquiry sent through the full chain (client submits → artist accepts → restaurant confirms) with all emails confirmed delivered by the site owner. Three real bugs were found and fixed in that final pass — see the gotchas list above; none were novel afterward.
