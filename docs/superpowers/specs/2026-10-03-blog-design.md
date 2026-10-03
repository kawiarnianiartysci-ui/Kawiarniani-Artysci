# Blog — Design Spec

**Date:** 2026-10-03
**Feature:** Blog at `/blog` with posts written by Joanna in Google Docs
**Status:** Implemented and live (2026-10-03)
**First posts:** (1) Christmas team-building (integracja firmowa przed świętami), early October 2026 — booking season; (2) baby shower ideas ~2 weeks later; then one post a month. Claude drafts in Google Docs, Joanna edits and adds photos.

---

## Goal

Roughly one post a month to (1) rank for informational queries ("pomysł na baby shower Poznań", "integracja świąteczna Poznań"), (2) get cited by AI answer engines (GEO), (3) funnel readers into the existing offer (occasion pages, workshop profiles). Mix: ~2/3 practical guides tied to an occasion, ~1/3 brand/mission pieces (e.g. restaurants as cultural centres).

**Hard requirement:** genuine self-service. Joanna writes like in Word (Google Docs), pastes photos into the doc, adds one Sheet row. No GitHub, no Claude, no image resizing on her side.

## Authoring workflow (Joanna)

1. Write the post in a Google Doc. First heading = title, first paragraph = intro, photos pasted inline where they should appear.
2. Share the doc: Udostępnij → Każdy, kto ma link → Wyświetlający.
3. Add a row to the new **"Blog"** tab of the existing Sheet.
4. Preview at `/blog/<adres>?podglad` while `opublikowany` = nie; flip to `tak` to publish. Later edits in the doc appear on the site within minutes.

### Sheet tab "Blog"

| column | meaning |
|---|---|
| `link` | URL of the Google Doc |
| `data` | publication date (YYYY-MM-DD), drives ordering and `datePublished` |
| `adres` | URL slug, e.g. `swiateczna-integracja-firmowa-poznan` (stable; changing it breaks the old URL) |
| `okazja` | optional occasion slug from `OCCASIONS` (`integracja-firmowa`, `baby-shower`, …) — drives the CTA box and the reverse link on the occasion page |
| `opublikowany` | `tak` / `nie` |

The tab must be published to CSV like the other tabs (new `CSV_BLOG_URL` in `src/dane.js`).

### Derived from the doc (no Sheet column)

- **title** — first heading (fallback: doc title)
- **cover image** — first image (used on the list tile and as `og:image`)
- **description** — first paragraph, trimmed to ~160 chars
- **reading time** — word count / 200, rounded up

## Fetching approach — live fetch with cache (chosen)

The server fetches the doc's HTML on request, sanitises it, caches it in memory (~10 min, like `_sheet.js`), and the CDN caches the page (`s-maxage=300, stale-while-revalidate`). The last good version of each post is kept and served if Google fails.

**Spike before building anything else:** create a test doc with pasted images, fetch it via the candidate URL forms (`/export?format=html` on a link-shared doc vs. "Publish to web" `/pub`), and check whether the image URLs (`*.googleusercontent.com`) are stable over time / across fetches and load without auth. Outcome decides the sharing step in the workflow. **If image URLs are not stable, fall back to "snapshot" mode:** Claude copies text + images into the repo on Joanna's "gotowe" (images to `public/images/blog/`), and the doc stays the editing source.

Images are decoded from the export and resized by `api/blog-img.js` with `sharp` (URL scheme `/blog-img/<adres>/<n>-<640|1080|1200>.<webp|jpg>`, CDN-cached 24 h), so phone-size photos never need manual resizing and stay under the 4.5 MB function-response limit. Lists (`/blog`, occasion-page links) read the cheap `export?format=txt` version for title/intro/reading time; only the post page fetches the full HTML.

**Spike result (2026-10-03):** `https://docs.google.com/document/d/<id>/export?format=html` on a doc shared "anyone with the link can view" returns 200 anonymously; an unshared doc returns 401. Images are **embedded as base64 `data:` URIs** inside the export (no googleusercontent URLs), so image stability is a non-issue and live fetch stays. Headings arrive as `h1`/`h2` with class-based styling, links wrapped in `google.com/url?q=…`, images carry inline width/height styles. Consequences: Joanna's sharing step = "Udostępnij → Każdy, kto ma link → Wyświetlający" (no "Publish to web"); the server extracts the base64 images and serves them from its own endpoint (e.g. `/api/blog-img?adres=<adres>&n=<index>`, long CDN cache) instead of inlining megabytes into the page, and resizes through Vercel Image Optimization if that works for a function-served local path (verify during implementation; otherwise serve the original with caching). The `remotePatterns` entry for Google image hosts is not needed.

### Sanitisation

Whitelist only: `h2`–`h4` (doc's first heading becomes the page `h1`; other headings shifted down so there is exactly one `h1`), `p`, `strong`/`b`, `em`/`i`, `ul`/`ol`/`li`, `a[href]` (Google redirect wrappers `google.com/url?q=` unwrapped; external links get `rel="noopener"`), `img[src,alt]`, `blockquote`. All inline styles, classes, fonts, colours, spans, comments and scripts are stripped. Empty paragraphs removed. Implemented as a small pure function in `api/_blog.js` (no new npm dependency if a regex/tokeniser approach is sufficient for Google's predictable export HTML; otherwise a lightweight sanitiser package).

## Pages and placement (UX)

Based on NN/g guidance for small service sites: the blog link lives in the **top-right utility position of the header**, labelled plainly **"Blog"** (familiar labels outperform creative ones), and in the **footer**; contextual in-content links connect blog ↔ offer.

- **Header:** plain text link "Blog", visually distinct from the mode switcher (the switcher changes site mode; the blog is a place, not a mode). On mobile it sits as a small link above the switcher — never a 4th pill.
- **Footer:** "Blog" as the first item of the occasion-link row.
- **`/blog`** — list, newest first: tile with cover image, title, date, ~2-sentence intro. Same tile language as workshop cards (tint+border, no arrows — see UI design language).
- **`/blog/<adres>`** — article: ~680px text column, site fonts/colours, images full column width with rounded corners; under the title: date · "Joanna · Kawiarniani Artyści" · reading time. At the end: **"Zaplanuj taki event"** box linking to the `okazja` page + 2–3 matching workshop tiles (`occasionWorkshops`). No `okazja` → box links to the homepage wizard.
- **Occasion page** (`OccasionPage` + `occasionBody`): "Przeczytaj na blogu: …" links to published posts with that `okazja`.

Routing: `parseRoute` gains `{ type: "blogList" }` and `{ type: "blogPost", slug }`; React shows them as a new `landing` type (`{ type: "blog" }`), following the `OccasionPage` pattern. Blog pages are always loaded from the server (header/footer "Blog" links and post links are plain `<a href>`, full page load); the server embeds the list or post as `window.__BLOG__`. A small JSON endpoint (`/api/blog`) gives in-app occasion pages their "Przeczytaj na blogu" links.

## SEO / GEO

- Server-rendered plain HTML for list and post via `api/page.js` (works without JS — link previews, AI crawlers).
- Per-page title, description, canonical, OG/Twitter image.
- JSON-LD: `BlogPosting` (headline, image, datePublished, author Person "Joanna", publisher Organization), `BreadcrumbList` (Kawiarniani Artyści › Blog › post); `Blog` on the list page.
- **FAQ:** if the doc has a heading "Najczęstsze pytania" followed by question sub-headings with answer paragraphs, emit `FAQPage` JSON-LD for that section.
- `sitemap.xml` includes `/blog` and every published post.
- Unpublished posts: 404 for everyone; with `?podglad` they render with `noindex`.
- GA4: page views are automatic; new event `blog_cta_click` (params: post slug, target) on the "Zaplanuj taki event" box.

## Error handling

- Doc fetch fails / Google slow → serve last good cached version; if none, post returns 503 with short cache and `noindex`, list page still renders (post omitted).
- Doc not shared / bad link / Sheet row incomplete (`link` or `adres` missing) → post treated as non-existent (404); logged with `console.error`.
- Blog tab fetch fails → `/blog` shows "Wpisy chwilowo niedostępne", rest of site unaffected; sitemap omits posts (short cache), same as current Sheet-failure behaviour.

## Testing

- Spike result recorded in this spec before implementation continues.
- Sanitiser tested against a real exported doc (headings, lists, links, images, stray formatting).
- Build on a preview branch; preview deployments run in test mode. Click through `/blog`, a post, `?podglad`, header/footer links, occasion-page reverse link, CTA box, on desktop and mobile (375px), plus view-source check of server HTML, JSON-LD (Rich Results Test), and sitemap.
- Joanna reviews the preview before merge to `main`.

## Out of scope (YAGNI)

Comments, tags/categories, search, pagination (until there are >12 posts), RSS, multiple authors, newsletter signup.
