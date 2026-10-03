// ══════════════════════════════════════════════════════════════
// 📝  BLOG: zamiana eksportu Google Docs na czysty HTML wpisu
// ══════════════════════════════════════════════════════════════
// Joanna pisze wpis w zwykłym Dokumencie Google. Google oddaje go jako HTML
// pełen klas, stylów, czcionek i zdjęć zapisanych w base64. Tu zostawiamy
// tylko to, co ma sens na stronie: nagłówki, akapity, pogrubienia, kursywę,
// listy, linki i zdjęcia — wygląd nadaje już styl strony. Wszystko inne
// (kolory, rozmiary, komentarze, skrypty) wypada, więc nic z dokumentu nie
// może "rozjechać" strony ani wstrzyknąć na nią czegoś obcego.
// Czysta funkcja bez zależności — testy w tests/blog.test.mjs.

const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: String.fromCharCode(160),
  oacute: "ó", Oacute: "Ó", eacute: "é", aacute: "á", uuml: "ü", ouml: "ö", auml: "ä", szlig: "ß",
  ndash: "–", mdash: "—", hellip: "…", bdquo: "„", rdquo: "”", ldquo: "“", rsquo: "’", lsquo: "‘",
  laquo: "«", raquo: "»", copy: "©", deg: "°", times: "×",
};
export function decodeEntities(s) {
  return String(s || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return NAMED[e] ?? m;
  });
}

const escText = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const attr = (attrs, name) => { const m = attrs.match(new RegExp(`\\s${name}="([^"]*)"`, "i")); return m ? m[1] : null; };
// Linia w nawiasach kwadratowych = notatka robocza ("[ZDJĘCIE: …]") — nie
// liczy się jako tytuł ani wstęp.
const isNote = text => /^\[.*\]$/.test(text);
const wordCount = text => (text ? text.split(/\s+/).filter(Boolean).length : 0);

// Google zapisuje pogrubienie/kursywę jako klasy (np. .c4{font-weight:700}).
function styleClasses(html) {
  const bold = new Set(), italic = new Set();
  for (const css of html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []) {
    for (const [, cls, body] of css.matchAll(/\.([a-z0-9_-]+)\{([^}]*)\}/gi)) {
      if (/font-weight:\s*(700|bold)/i.test(body)) bold.add(cls);
      if (/font-style:\s*italic/i.test(body)) italic.add(cls);
    }
  }
  return { bold, italic };
}

// Link z dokumentu: Google owija każdy w https://www.google.com/url?q=…
// Linki do naszej strony zamieniamy na względne (/integracja-firmowa).
const SITE_HOST = /^https?:\/\/(www\.)?kawiarnianiartysci\.pl(?=[/?#]|$)/i;
export function cleanHref(raw) {
  let href = decodeEntities(raw).trim();
  const g = href.match(/^https?:\/\/(www\.)?google\.com\/url\?(.*)$/i);
  if (g) { const q = new URLSearchParams(g[2]).get("q"); if (q) href = q; }
  if (SITE_HOST.test(href)) return { href: href.replace(SITE_HOST, "") || "/", external: false };
  if (/^(https?:|mailto:|tel:)/i.test(href)) return { href, external: /^https?:/i.test(href) };
  return null;
}

const SKIP = new Set(["head", "style", "script", "title"]);

export function parseDoc(html, { imgSrc }) {
  const { bold, italic } = styleClasses(html);
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [null, html])[1];
  const out = [], images = [], faq = [];
  let title = "", intro = "", words = 0;
  let block = null;            // { tag, heading, level, parts, text, before }
  const spans = [];            // zamknięcia otwartych <span> (np. "</strong>")
  let linkOpen = false, skipLink = false, skipDepth = 0;
  let faqLevel = 0, faqItem = null;

  const openBlock = (tag, heading, level) => { block = { tag, heading, level, parts: [], text: "", before: [] }; };
  const closeBlock = () => {
    if (!block) return;
    const b = block; block = null;
    const text = b.text.replace(/\s+/g, " ").trim();
    const inner = b.parts.join("").trim();
    // Zdjęcie wklejone w linijkę nagłówka — wstawiamy je przed nagłówkiem.
    out.push(...b.before.map(img => `<p>${img}</p>`));
    if (b.heading && b.level === 1 && !title && text) { title = text; return; }
    if (!text && !inner.includes("<img ")) return;
    if (!title && isNote(text)) return;
    words += wordCount(text);
    if (b.heading) {
      const lvl = Math.min(4, Math.max(2, b.level));
      out.push(`<h${lvl}>${inner}</h${lvl}>`);
      if (/^najcz[eę]stsze pytania/i.test(text)) { faqLevel = lvl; faqItem = null; }
      else if (faqLevel && lvl > faqLevel) { faqItem = { q: text, a: "" }; faq.push(faqItem); }
      else { faqLevel = 0; faqItem = null; }
      return;
    }
    out.push(b.tag === "li" ? `<li>${inner}</li>` : `<p>${inner}</p>`);
    if (title && !intro && b.tag === "p" && !isNote(text) && wordCount(text) >= 6) intro = text;
    if (faqItem && text) faqItem.a = `${faqItem.a} ${text}`.trim();
  };

  for (const m of body.matchAll(/<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g)) {
    const [, close, rawName, attrs = "", text] = m;
    if (text !== undefined) {
      if (skipDepth || skipLink || !block) continue;
      const decoded = decodeEntities(text);
      block.parts.push(escText(decoded));
      block.text += decoded;
      continue;
    }
    const name = rawName.toLowerCase();
    if (SKIP.has(name)) { skipDepth = Math.max(0, skipDepth + (close ? -1 : 1)); continue; }
    if (skipDepth) continue;

    if (name === "p" || /^h[1-6]$/.test(name)) {
      if (close) { closeBlock(); continue; }
      closeBlock();
      const isTitle = name === "p" && (attr(attrs, "class") || "").split(/\s+/).includes("title");
      const level = isTitle ? 1 : name[0] === "h" ? Number(name[1]) : 0;
      openBlock("p", level > 0, level);
    } else if (name === "li") {
      closeBlock();
      if (!close) openBlock("li", false, 0);
    } else if (name === "ul" || name === "ol") {
      closeBlock();
      out.push(close ? `</${name}>` : `<${name}>`);
    } else if (name === "span") {
      if (close) { const c = spans.pop() || []; if (block) block.parts.push(c.join("")); continue; }
      const cls = (attr(attrs, "class") || "").split(/\s+/);
      const closers = [];
      if (block && !block.heading) {
        if (cls.some(c => bold.has(c))) { block.parts.push("<strong>"); closers.unshift("</strong>"); }
        if (cls.some(c => italic.has(c))) { block.parts.push("<em>"); closers.unshift("</em>"); }
      }
      spans.push(closers);
    } else if (name === "a") {
      if (close) {
        if (skipLink) skipLink = false;
        else if (linkOpen) { if (block) block.parts.push("</a>"); linkOpen = false; }
        continue;
      }
      const href = attr(attrs, "href") || "";
      // Na końcu eksportu Google dokleja komentarze i przypisy — tam kończymy.
      if (/^#(cmnt|ftnt)_ref/.test(href)) { block = null; break; }
      if (href.startsWith("#")) { skipLink = true; continue; }
      const link = cleanHref(href);
      if (link && block) {
        block.parts.push(`<a href="${escAttr(link.href)}"${link.external ? ' target="_blank" rel="noopener"' : ""}>`);
        linkOpen = true;
      }
    } else if (name === "img" && !close) {
      const src = decodeEntities(attr(attrs, "src") || "");
      const data = src.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i);
      if (data) images.push({ mime: data[1].toLowerCase(), data: data[2] });
      else if (/^https:\/\//i.test(src)) images.push({ url: src });
      else continue;
      const i = images.length - 1;
      // Pierwsze zdjęcie (główne, zwykle tuż pod wstępem) ładuje się od razu, reszta przy przewijaniu.
      const tag = `<img src="${escAttr(imgSrc(i))}" alt="__ALT${i}__" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
      if (!block) out.push(`<p>${tag}</p>`);
      else if (block.heading) block.before.push(tag);
      else block.parts.push(tag);
    } else if (name === "br" && block) {
      block.parts.push("<br>");
    }
    // Pozostałe znaczniki (div, table, sup, hr…) pomijamy, zostawiając ich tekst.
  }
  closeBlock();

  const altBase = title || "Wpis na blogu";
  const htmlOut = out.join("\n").replace(/__ALT(\d+)__/g, (_, n) => escAttr(`${altBase} — zdjęcie ${Number(n) + 1}`));
  return { title, intro, html: htmlOut, images, words, faq: faq.filter(f => f.q && f.a) };
}

// Wersja tekstowa dokumentu (export?format=txt) — kilka KB zamiast
// megabajtów ze zdjęciami. Wystarcza do listy wpisów: tytuł, wstęp, długość.
export function parseDocText(txt) {
  const lines = String(txt || "").replace(/^﻿/, "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const content = lines.filter(l => !isNote(l));
  const title = content[0] || "";
  const intro = content.slice(1).find(l => !/^\* /.test(l) && wordCount(l) >= 6) || "";
  return { title, intro, words: wordCount(content.join(" ")) };
}
