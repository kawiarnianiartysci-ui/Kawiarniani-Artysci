// ══════════════════════════════════════════════════════════════
// 🔎  PODSTRONY: profile, okazje, strona 404
// ══════════════════════════════════════════════════════════════
// Każdy adres inny niż strona główna (np. /warsztaty/ebru-marbled-minds,
// /miejsca/zuk, /wieczor-panienski) trafia tutaj (patrz vercel.json).
// Funkcja bierze gotową stronę (api/_szablon.js, generowany przy buildzie)
// i przed wysłaniem wpisuje do niej:
//  - tytuł, opis, adres kanoniczny i zdjęcie tego konkretnego profilu/okazji
//    (to czytają Google, Facebook, WhatsApp, Messenger, LinkedIn i czaty AI —
//    one nie uruchamiają JavaScriptu, widzą tylko to, co jest w HTML-u),
//  - dane strukturalne (JSON-LD) dla Google,
//  - treść strony w zwykłym HTML-u (widoczna też bez JavaScriptu),
//  - dane z arkusza, żeby przeglądarka nie musiała pobierać ich drugi raz.
// Potem normalnie uruchamia się aplikacja i pokazuje ten sam profil/okazję.
// Odpowiedzi są trzymane w pamięci podręcznej Vercela przez ~5 minut, więc
// zmiana w arkuszu pojawia się tu najpóźniej po kilku minutach.
import { getSheetData } from "./_sheet.js";
import { escapeHtml as esc } from "./_shared.js";
import {
  SITE_URL, BRAND, HOME_TITLE, OCCASIONS, parseRoute, findBySlug, profilePath, occasionPath,
  occasionWorkshops, occasionPlaces, minWorkshopPrice, shorten,
  workshopTitle, restaurantTitle, workshopDescription, restaurantDescription,
} from "../src/seo.js";

const DEFAULT_IMAGE = "/images/hero-photo.jpg";
const DAY_NAMES = { pon:"Monday", wt:"Tuesday", sr:"Wednesday", czw:"Thursday", pt:"Friday", sob:"Saturday", nd:"Sunday" };

// Adres względny (/images/x y.jpg) → pełny, z zakodowanymi spacjami.
const abs = p => (!p ? undefined : /^https?:\/\//.test(p) ? p : SITE_URL + encodeURI(p));
// JSON wklejany do <script> — "<" zamienione, żeby tekst z arkusza nie mógł
// przypadkiem zamknąć znacznika </script>.
const jsonForScript = obj => JSON.stringify(obj).replace(/</g, "\\u003c");
const cleanAddress = a => String(a || "").replace(/;/g, ", ").trim();

let templatePromise = null;
const getTemplate = () => (templatePromise ||= import("./_szablon.js").then(m => m.default));

// ══ Dane strukturalne (JSON-LD) — tylko prawdziwe dane z arkusza ══
const breadcrumb = items => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: SITE_URL + it.path })),
});
const brandOrg = { "@type": "Organization", name: BRAND, url: SITE_URL };
const poznan = { "@type": "City", name: "Poznań" };

function workshopLd(w, path) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: w.name,
    description: shorten(w.description || w.bio, 300),
    serviceType: "Warsztaty artystyczne na eventy grupowe",
    url: SITE_URL + path,
    image: abs(w.photo || w.logo),
    areaServed: poznan,
    provider: brandOrg,
    ...(w.pricePerPerson ? { offers: { "@type": "Offer", price: String(w.pricePerPerson), priceCurrency: "PLN", url: SITE_URL + path } } : {}),
  };
}

function restaurantLd(r, path) {
  const isCafe = /kawiarn|cafe|caf[eé]/i.test(`${r.vibe || ""} ${r.name}`);
  const hours = Object.entries(r.hours || {})
    .filter(([day, h]) => DAY_NAMES[day] && h)
    .map(([day, h]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_NAMES[day], opens: h.open, closes: h.close }));
  const sameAs = [r.website, r.instagramUrl, r.facebookUrl].filter(u => u && /^https?:\/\//.test(u));
  return {
    "@context": "https://schema.org",
    "@type": isCafe ? "CafeOrCoffeeShop" : "Restaurant",
    "@id": `${SITE_URL}${path}#miejsce`,
    name: r.name,
    description: shorten(r.fullDescription || r.description, 300),
    url: SITE_URL + path,
    image: abs(r.photo || r.logo),
    ...(r.address ? { address: { "@type": "PostalAddress", streetAddress: cleanAddress(r.address), addressLocality: "Poznań", addressCountry: "PL" } } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

function occasionLd(o, ws, path) {
  const low = minWorkshopPrice(ws);
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: o.h1,
    description: o.description,
    serviceType: "Warsztaty artystyczne na eventy grupowe",
    url: SITE_URL + path,
    areaServed: poznan,
    provider: brandOrg,
    ...(low ? { offers: { "@type": "AggregateOffer", lowPrice: String(low), priceCurrency: "PLN", offerCount: ws.length } } : {}),
  };
}

// ══ Treść w zwykłym HTML-u ═══════════════════════════════════
// Widoczna dla robotów i przez ułamek sekundy, zanim wystartuje aplikacja
// (potem aplikacja ją podmienia na pełny widok) — stąd prosty, spokojny wygląd
// w barwach marki, wyśrodkowany jak reszta strony.
const S = {
  main: "font-family:Montserrat,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:32px 16px;text-align:center;color:#1A1A1A;line-height:1.65;",
  brand: "color:#432A16;text-decoration:none;font-size:14px;",
  h1: "font-size:28px;font-weight:400;margin:18px 0 8px;",
  muted: "color:#6B6862;font-size:14px;",
  img: "width:100%;max-width:560px;height:auto;border-radius:14px;margin:16px auto;display:block;",
  list: "list-style:none;padding:0;margin:0 0 20px;",
  link: "color:#432A16;",
  nav: "margin-top:32px;padding-top:16px;border-top:1px solid #DDD9D2;font-size:13px;",
};
const navOccasions = () => `<nav style="${S.nav}">${OCCASIONS.map(o => `<a style="${S.link}" href="${occasionPath(o)}">${esc(o.navLabel)}</a>`).join(" · ")} · <a style="${S.link}" href="/">Strona główna</a></nav>`;
const header = () => `<a style="${S.brand}" href="/">${BRAND}</a>`;
const paragraphs = text => String(text || "").split(/\n+/).map(t => t.trim()).filter(Boolean).map(t => `<p>${esc(t)}</p>`).join("");

function workshopBody(w) {
  const includes = (w.includes || []).map(i => `<li>+ ${esc(i)}</li>`).join("");
  return `<main style="${S.main}">${header()}
<h1 style="${S.h1}">${esc(w.name)}</h1>
${w.artist ? `<p style="${S.muted}">${esc(w.artist)}</p>` : ""}
${w.photo ? `<img style="${S.img}" src="${esc(w.photo)}" alt="${esc(w.name)}">` : ""}
${paragraphs(w.description)}${w.bio && w.bio !== w.description ? paragraphs(w.bio) : ""}
${includes ? `<p style="${S.muted}">W cenie:</p><ul style="${S.list}">${includes}</ul>` : ""}
${w.pricePerPerson ? `<p><strong>${esc(w.pricePerPerson)} zł</strong> / os.${w.duration ? ` · ${esc(w.duration)}` : ""}</p>` : ""}
<p>Warsztat na eventy grupowe w Poznaniu — w kawiarni, restauracji albo u Ciebie. Wybierz termin i wyślij zapytanie na ${BRAND}.</p>
${navOccasions()}</main>`;
}

function restaurantBody(r) {
  const variants = (r.variants || []).map(v => `<li>${esc(v.label)}${v.detail ? ` — ${esc(v.detail)}` : ""}${v.price != null ? ` · ${v.priceMax ? `${esc(v.price)}–${esc(v.priceMax)}` : esc(v.price)} zł/os.` : ""}</li>`).join("");
  return `<main style="${S.main}">${header()}
<h1 style="${S.h1}">${esc(r.name)}</h1>
<p style="${S.muted}">${esc([r.vibe, r.location].filter(Boolean).join(" · "))}</p>
${r.tagline ? `<p><em>${esc(r.tagline)}</em></p>` : ""}
${r.photo ? `<img style="${S.img}" src="${esc(r.photo)}" alt="${esc(r.name)}">` : ""}
${paragraphs(r.fullDescription || r.description)}
${r.address ? `<p style="${S.muted}">${esc(cleanAddress(r.address))}</p>` : ""}
${variants ? `<p style="${S.muted}">Pakiety:</p><ul style="${S.list}">${variants}</ul>` : ""}
<p>Zorganizuj tu event z warsztatem artystycznym — wybierz warsztat i termin, wyślij zapytanie na ${BRAND}.</p>
${navOccasions()}</main>`;
}

function occasionBody(o, ws, ps) {
  const low = minWorkshopPrice(ws);
  const wItems = ws.map(w => `<li><a style="${S.link}" href="${profilePath("workshop", w)}">${esc(w.name)}</a>${w.artist ? ` — ${esc(w.artist)}` : ""}${w.pricePerPerson ? ` · ${esc(w.pricePerPerson)} zł/${o.kids ? "dziecko" : "os."}` : ""}</li>`).join("");
  const pItems = ps.map(r => `<li><a style="${S.link}" href="${profilePath("restaurant", r)}">${esc(r.name)}</a>${r.vibe ? ` — ${esc(r.vibe)}` : ""}</li>`).join("");
  return `<main style="${S.main}">${header()}
<h1 style="${S.h1}">${esc(o.h1)}</h1>
${o.paragraphs.map(p => `<p>${esc(p)}</p>`).join("")}
${low ? `<p>Warsztaty od <strong>${low} zł</strong> za ${o.kids ? "dziecko" : "osobę"}.</p>` : ""}
${wItems ? `<h2 style="font-size:20px;font-weight:400;">Warsztaty</h2><ul style="${S.list}">${wItems}</ul>` : ""}
${pItems ? `<h2 style="font-size:20px;font-weight:400;">Miejsca w Poznaniu</h2><ul style="${S.list}">${pItems}</ul>` : ""}
${navOccasions()}</main>`;
}

function notFoundBody() {
  return `<main style="${S.main}">${header()}
<h1 style="${S.h1}">Nie znaleziono tej strony</h1>
<p>Ten adres nie istnieje albo profil został usunięty.</p>
<p><a style="${S.link}" href="/">Przejdź na stronę główną</a></p>
${navOccasions()}</main>`;
}

// ══ Składanie strony ═════════════════════════════════════════
function headBlock({ title, description, path, image, noindex, jsonLd }) {
  const url = path ? SITE_URL + path : null;
  const img = abs(image || DEFAULT_IMAGE);
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noindex ? `<meta name="robots" content="noindex" />` : "",
    url ? `<link rel="canonical" href="${esc(url)}" />` : "",
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="pl_PL" />`,
    url ? `<meta property="og:url" content="${esc(url)}" />` : "",
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(img)}" />`,
    ...(jsonLd || []).map(ld => `<script type="application/ld+json">${jsonForScript(ld)}</script>`),
  ].filter(Boolean).join("\n    ");
}

function buildPage(route, data) {
  const restaurants = data ? data.restaurants : [];
  const workshops = data ? data.workshops : [];

  if (route.type === "workshop" || route.type === "restaurant") {
    const isW = route.type === "workshop";
    const item = findBySlug(isW ? workshops : restaurants, route.slug);
    if (item) {
      const path = profilePath(route.type, item);
      // Stary adres (po id, sprzed wpisania sluga) → stały przekierunek na nowy.
      if (item.slug !== route.slug) return { redirect: path };
      return {
        status: 200,
        title: isW ? workshopTitle(item) : restaurantTitle(item),
        description: isW ? workshopDescription(item) : restaurantDescription(item),
        path,
        image: item.photo || item.logo,
        // Szkic (comingSoon) — widoczny pod linkiem, ale ukryty przed Google.
        noindex: !!item.comingSoon,
        jsonLd: [
          isW ? workshopLd(item, path) : restaurantLd(item, path),
          breadcrumb([{ name: BRAND, path: "/" }, { name: item.name, path }]),
        ],
        body: isW ? workshopBody(item) : restaurantBody(item),
      };
    }
  }

  if (route.type === "occasion") {
    const o = OCCASIONS.find(x => x.slug === route.slug);
    const ws = occasionWorkshops(o, workshops);
    const ps = occasionPlaces(o, restaurants);
    const path = occasionPath(o);
    return {
      status: 200, title: o.title, description: o.description, path,
      image: o.kids ? "/images/hero-photo-dzieci.jpg" : DEFAULT_IMAGE,
      jsonLd: [occasionLd(o, ws, path), breadcrumb([{ name: BRAND, path: "/" }, { name: o.navLabel, path }])],
      body: occasionBody(o, ws, ps),
    };
  }

  return {
    status: 404,
    title: `Nie znaleziono strony | ${BRAND}`,
    description: "Ten adres nie istnieje. Zobacz warsztaty artystyczne i miejsca na eventy w Poznaniu.",
    noindex: true,
    body: notFoundBody(),
  };
}

export default async function handler(req, res) {
  const route = parseRoute(String(req.query.p || "/"));

  let template;
  try {
    template = await getTemplate();
  } catch (err) {
    // Brak szablonu = coś poszło nie tak przy buildzie — lepiej strona
    // główna niż błąd.
    console.error("Brak api/_szablon.js:", err);
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, "/");
    return;
  }

  let data = null;
  try {
    data = await getSheetData();
  } catch (err) {
    console.error("Arkusz:", err);
  }

  // Arkusz chwilowo nie odpowiada, a to profil — nie wiemy, czy istnieje.
  // Oddajemy zwykłą stronę (aplikacja sama pobierze dane i pokaże profil)
  // i nie zapamiętujemy jej na długo.
  if (!data && (route.type === "workshop" || route.type === "restaurant")) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30");
    res.status(200).send(template);
    return;
  }

  const page = route.type === "home" ? null : buildPage(route, data);
  if (!page) {
    res.redirect(301, "/");
    return;
  }
  if (page.redirect) {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
    res.redirect(301, page.redirect);
    return;
  }

  const dataScript = data
    ? `<script>window.__DANE_ARKUSZA__=${jsonForScript({ r: data.restText, w: data.workText })};</script>`
    : "";
  // Zamiany przez funkcję (nie zwykły tekst), żeby znak "$" w danych z
  // arkusza nie był potraktowany jako specjalny wzorzec podstawienia.
  const html = template
    .replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, () => headBlock(page))
    .replace(/<!-- NOSCRIPT:START -->[\s\S]*?<!-- NOSCRIPT:END -->/, () => "")
    .replace('<div id="root"></div>', () => `<div id="root">${page.body}</div>${dataScript}`);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", page.status === 200
    ? "public, max-age=0, s-maxage=300, stale-while-revalidate=86400"
    : "public, max-age=0, s-maxage=60");
  res.status(page.status).send(html);
}
