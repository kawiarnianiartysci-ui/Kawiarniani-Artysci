// ══════════════════════════════════════════════════════════════
// 📝  BLOG — wpisy z Dokumentów Google, lista z zakładki "Blog" arkusza
// ══════════════════════════════════════════════════════════════
// Joanna pisze wpis w Dokumencie Google (udostępnionym "każdy, kto ma link")
// i dopisuje wiersz w zakładce Blog. Serwer pobiera dokument sam:
//  - lista wpisów (/blog, linki na stronach okazji) — wersja tekstowa
//    dokumentu (kilka KB): tytuł, wstęp, czas czytania,
//  - sam wpis (/blog/<adres>) — wersja HTML ze zdjęciami (api/_blogDoc.js).
// Pamięć podręczna ~3 min; gdy Google chwilowo nie odpowiada, pokazujemy
// ostatnią dobrą wersję wpisu.
import { CSV_BLOG_URL, csvToObjects, blogPostFromRow } from "../src/dane.js";
import { shorten, blogImgPath } from "../src/seo.js";
import { parseDoc, parseDocText, imgHash } from "./_blogDoc.js";

const INDEX_MS = 5 * 60 * 1000;
const DOC_MS = 3 * 60 * 1000;
let indexCache = null;          // { at, rows }
const docCache = new Map();     // "docId|adres" → { at, value }  (HTML)
const textCache = new Map();    // "docId|adres" → { at, value }  (txt)

export async function getBlogIndex() {
  if (indexCache && Date.now() - indexCache.at < INDEX_MS) return indexCache.rows;
  const res = await fetch(CSV_BLOG_URL);
  if (!res.ok) throw new Error(`Arkusz (blog): ${res.status}`);
  const rows = csvToObjects(await res.text()).map(blogPostFromRow).filter(r => r.docId && r.slug);
  indexCache = { at: Date.now(), rows };
  return rows;
}

export const publishedRows = rows => rows.filter(r => r.published).sort((a, b) => b.date.localeCompare(a.date));

const exportUrl = (docId, format) => `https://docs.google.com/document/d/${docId}/export?format=${format}`;

async function cachedDoc(cache, row, format, parse) {
  const key = `${row.docId}|${row.slug}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DOC_MS) return { value: hit.value };
  try {
    const res = await fetch(exportUrl(row.docId, format));
    if ([401, 403, 404].includes(res.status)) throw Object.assign(new Error(`${res.status} — dokument nieudostępniony albo usunięty`), { missing: true });
    if (!res.ok) throw new Error(String(res.status));
    const value = parse(await res.text());
    if (!value.title) throw Object.assign(new Error("dokument bez tytułu"), { missing: true });
    cache.set(key, { at: Date.now(), value });
    return { value };
  } catch (err) {
    console.error(`Blog (${row.slug}, ${format}):`, err.message);
    if (hit) return { value: hit.value };
    return { error: err.missing ? "missing" : "unavailable" };
  }
}

const meta = (row, doc) => ({
  slug: row.slug, date: row.date, occasion: row.occasion, published: row.published,
  title: doc.title, intro: shorten(doc.intro, 200), readMin: Math.max(1, Math.ceil(doc.words / 200)),
});

export async function getPost(row) {
  const r = await cachedDoc(docCache, row, "html", html => parseDoc(html, { imgSrc: (i, img) => blogImgPath(row.slug, i, 1080, "webp", imgHash(img)) }));
  if (r.error) return { error: r.error };
  const d = r.value;
  return {
    post: {
      ...meta(row, d),
      description: shorten(d.intro, 160),
      html: d.html, images: d.images, faq: d.faq,
      ogImage: d.images.length ? blogImgPath(row.slug, 0, 1200, "jpg", imgHash(d.images[0])) : null,
    },
  };
}

export async function listPosts() {
  const rows = publishedRows(await getBlogIndex());
  const items = await Promise.all(rows.map(async row => {
    const r = await cachedDoc(textCache, row, "txt", parseDocText);
    return r.value ? { ...meta(row, r.value), cover: blogImgPath(row.slug, 0, 640, "webp") } : null;
  }));
  return items.filter(Boolean);
}

// Wpis do wklejenia w stronę (window.__BLOG__) — bez zdjęć w base64.
export function pagePost(post) {
  const { images, ...rest } = post;
  return rest;
}
