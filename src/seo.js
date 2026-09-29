// ══════════════════════════════════════════════════════════════
// 🔎  ADRESY PODSTRON, TYTUŁY I TEKSTY OKAZJI
// ══════════════════════════════════════════════════════════════
// Wspólne dla strony (src/App.jsx) i serwera (api/page.js, api/sitemap.js):
//  - jakie adresy istnieją (/warsztaty/<slug>, /miejsca/<slug>, okazje),
//  - jaki tytuł i opis ma każda podstrona (dla Google i podglądów linków),
//  - treść podstron okazji (wieczór panieński, urodziny...).
// Serwer wstawia te tytuły/opisy/zdjęcia do HTML-a, zanim strona trafi do
// Google'a czy Facebooka (one nie uruchamiają JavaScriptu), a przeglądarka
// używa tych samych danych, żeby pokazać tę samą treść i ten sam tytuł karty.
import { slugify } from "./dane.js";

export const SITE_URL = "https://www.kawiarnianiartysci.pl";
export const BRAND = "Kawiarniani Artyści";
export const HOME_TITLE = "Kawiarniani Artyści — Warsztaty + Restauracja w Poznaniu";

// ══ Podstrony okazji ═════════════════════════════════════════
// ✏️ Teksty do zmiany tutaj. `kids: true` = podstrona trybu "Eventy dla
// dzieci" (pokazuje warsztaty dla dzieci i miejsca przyjazne dzieciom),
// pozostałe pokazują wszystkie warsztaty i miejsca dla dorosłych.
// Zasada: żadnych zmyślonych cen, liczb ani opinii — ceny "od ... zł" na
// podstronie liczą się same z arkusza.
export const OCCASIONS = [
  {
    slug: "wieczor-panienski",
    kids: false,
    navLabel: "Wieczór panieński",
    title: "Wieczór panieński w Poznaniu — warsztaty przy kawie albo winie | Kawiarniani Artyści",
    h1: "Wieczór panieński w Poznaniu — przy sztuce, kawie albo winie",
    description: "Kreatywny wieczór panieński w Poznaniu: warsztaty artystyczne dla Ciebie i przyjaciółek w klimatycznej kawiarni lub restauracji. Wybierz warsztat i miejsce, wyślij zapytanie.",
    paragraphs: [
      "Jeśli szukacie spokojniejszego sposobu na spędzenie wieczoru panieńskiego i chcecie spróbować czegoś zupełnie nowego lub wręcz przeciwnie, sięgnąć po coś, co już znacie i lubicie, możecie po prostu zaprosić artystę prowadzącego warsztaty do Waszej ulubionej restauracji albo innej wybranej przestrzeni. To niezwykle wygodne logistycznie rozwiązanie, bo w jednym miejscu łączycie pyszne jedzenie i kolację z wyjątkową atrakcją.",
    ],
  },
  {
    slug: "urodziny",
    kids: false,
    navLabel: "Urodziny",
    title: "Urodziny w Poznaniu z warsztatami artystycznymi | Kawiarniani Artyści",
    h1: "Urodziny w Poznaniu — z warsztatem artystycznym przy stole",
    description: "Pomysł na urodziny w Poznaniu: warsztat artystyczny dla Ciebie i gości w kawiarni lub restauracji. Malowanie, ebru, ceramika, zapachy i więcej — wybierz i wyślij zapytanie.",
    paragraphs: [
      "Jeśli szukacie pomysłu na urodziny, które Wasze grono zapamięta na dłużej niż jeden wieczór, i chcecie spróbować czegoś nowego lub spędzić czas przy czymś, co znacie i lubicie, możecie po prostu zaprosić artystę prowadzącego warsztaty do Waszej ulubionej restauracji albo innej wybranej przestrzeni. To bardzo wygodne logistycznie rozwiązanie, bo w jednym miejscu łączycie pyszne jedzenie i wspólne świętowanie z wyjątkową atrakcją.",
    ],
  },
  {
    slug: "urodziny-dla-dzieci",
    kids: true,
    navLabel: "Urodziny dla dzieci",
    title: "Urodziny dla dzieci w Poznaniu — warsztaty kreatywne | Kawiarniani Artyści",
    h1: "Urodziny dla dzieci w Poznaniu — z warsztatem kreatywnym",
    description: "Urodziny dziecka w Poznaniu z warsztatem kreatywnym w miejscu przyjaznym dzieciom. Wybierz warsztat i salę, podaj liczbę dzieci i dorosłych, wyślij zapytanie.",
    paragraphs: [
      "Jeśli szukacie pomysłu na urodziny dla swojego dziecka, nasza platforma jest świetnym wyborem. Możecie zaprosić artystę prowadzącego kreatywne warsztaty do wybranej restauracji albo do własnej przestrzeni. Warsztaty da się łatwo dopasować do wieku dzieci, dzięki czemu rozwijają wyobraźnię, angażują i dają maluchom mnóstwo radości z tworzenia. Całość jest bardzo wygodna logistycznie, bo kwestie jedzenia i tortu dogadujecie bezpośrednio z elastyczną restauracją, a Wy w jednym miejscu macie zorganizowany poczęstunek i wartościową zabawę.",
    ],
  },
  {
    slug: "integracja-firmowa",
    kids: false,
    navLabel: "Integracja firmowa",
    title: "Integracja firmowa w Poznaniu — warsztaty kreatywne dla zespołu | Kawiarniani Artyści",
    h1: "Integracja firmowa w Poznaniu — warsztat kreatywny dla zespołu",
    description: "Kameralna integracja firmowa w Poznaniu: warsztat artystyczny dla zespołu w kawiarni lub restauracji, albo u Was w firmie. Wybierz warsztat i wyślij zapytanie.",
    paragraphs: [
      "Jeśli szukacie nowego sposobu na integrację firmową, nasza platforma jest świetnym wyborem. To wyjątkowo wygodne rozwiązanie organizacyjne, bo jeśli macie własną przestrzeń, możecie zaprosić artystę z warsztatami bezpośrednio do siebie do biura albo do wybranej restauracji. Cały zespół może na chwilę odejść od codziennych obowiązków i wcielić się w artystów, co generuje mnóstwo śmiechu i pozwala zobaczyć się z zupełnie innej strony. Dodatkowo każdy uczestnik wychodzi z własnoręcznie zrobioną pamiątką, dzięki czemu miłe wspomnienia z tego wyjścia zostają z Wami na dużo dłużej.",
    ],
  },
  {
    slug: "baby-shower",
    kids: false,
    navLabel: "Baby shower",
    title: "Baby shower w Poznaniu — warsztaty przy kawie | Kawiarniani Artyści",
    h1: "Baby shower w Poznaniu — przy kawie i wspólnym tworzeniu",
    description: "Baby shower w Poznaniu z warsztatem artystycznym w kameralnej kawiarni lub restauracji. Wybierz warsztat i miejsce, podaj termin i liczbę gości, wyślij zapytanie.",
    paragraphs: [
      "Jeśli szukacie nowego sposobu na spędzenie i zorganizowanie baby shower, nasza platforma jest świetnym wyborem. Jeśli nie chcecie wymyślać konkursów ani tradycyjnych gier, warsztaty w kameralnym gronie sprawdzą się idealnie. W naszej ofercie znajdziecie różnorodne zajęcia, z których na pewno wybierzecie coś, co przypadnie przyszłej mamie do gustu. Artystę możecie zaprosić do ulubionej restauracji, kawiarni albo własnej przestrzeni. W ten sposób skupiacie się na byciu ze sobą i niespiesznym świętowaniu, a każda z uczestniczek wychodzi ze spotkania z miłą, własnoręcznie zrobioną pamiątką.",
    ],
  },
];

// ══ Adresy ═══════════════════════════════════════════════════
export const occasionPath = o => `/${o.slug}`;
// type: "workshop" | "restaurant" — tak samo jak profileItem.type w App.jsx
export const profilePath = (type, item) => `/${type === "restaurant" ? "miejsca" : "warsztaty"}/${item.slug}`;

// Adres z paska przeglądarki → co pokazać. Wielkość liter, końcowy ukośnik
// i polskie znaki nie mają znaczenia (/Warsztaty/Ebru/ = /warsztaty/ebru).
export function parseRoute(pathname) {
  let p = pathname || "/";
  try { p = decodeURIComponent(p); } catch { /* zostaw jak jest */ }
  p = p.toLowerCase().replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/index.html") return { type: "home" };
  let m = p.match(/^\/warsztaty\/([^/]+)$/);
  if (m) return { type: "workshop", slug: slugify(m[1]) };
  m = p.match(/^\/miejsca\/([^/]+)$/);
  if (m) return { type: "restaurant", slug: slugify(m[1]) };
  const occ = OCCASIONS.find(o => p === occasionPath(o));
  if (occ) return { type: "occasion", slug: occ.slug };
  return { type: "notfound" };
}

// Szuka profilu po slugu. Drugie podejście (po samym id) łapie stare linki
// sprzed wpisania sluga w arkuszu — serwer przekierowuje je na nowy adres.
export function findBySlug(list, slug) {
  return list.find(x => x.slug === slug) || list.find(x => slugify(x.id) === slug) || null;
}

// ══ Co pokazać na podstronie okazji ══════════════════════════
export const occasionWorkshops = (o, workshops) =>
  workshops.filter(w => !w.comingSoon && (o.kids ? w.forKids : !w.kidsOnly));
export const occasionPlaces = (o, restaurants) =>
  restaurants.filter(r => !r.comingSoon && (o.kids ? (r.acceptsKids && r.kidsVariants.length > 0) : r.variants.length > 0));
export const minWorkshopPrice = workshops => {
  const prices = workshops.map(w => w.pricePerPerson).filter(n => n != null && n > 0);
  return prices.length ? Math.min(...prices) : null;
};

// ══ Tytuły i opisy ═══════════════════════════════════════════
// Skraca tekst do ~n znaków na granicy słowa (opisy dla Google mają ~155).
export function shorten(text, n = 155) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n).replace(/\s+\S*$/, "") + "…";
}

export function workshopTitle(w) {
  const who = w.artist && w.artist.trim() && !w.name.toLowerCase().includes(w.artist.trim().toLowerCase()) ? ` — ${w.artist.trim()}` : "";
  return `${w.name.trim()}${who} | Warsztaty w Poznaniu · ${BRAND}`;
}
export function restaurantTitle(r) {
  return `${r.name.trim()}, Poznań — eventy z warsztatami | ${BRAND}`;
}
export function workshopDescription(w) {
  const price = w.pricePerPerson ? ` Cena: ${w.pricePerPerson} zł/os.` : "";
  return shorten(`${shorten(w.description || w.bio, 125)}${price} Warsztat na eventy grupowe w Poznaniu.`, 200);
}
export function restaurantDescription(r) {
  return shorten(`${shorten(r.description || r.fullDescription, 120)} Warsztaty artystyczne na eventy grupowe w Poznaniu.`, 200);
}

// Tytuł karty przeglądarki dla aktualnego widoku (przeglądarka ustawia go
// przy każdej zmianie adresu — m.in. żeby GA4 widział właściwe nazwy stron).
export function pageTitle({ profileItem, landing }) {
  if (profileItem) return profileItem.type === "restaurant" ? restaurantTitle(profileItem.item) : workshopTitle(profileItem.item);
  if (landing?.type === "occasion") return OCCASIONS.find(o => o.slug === landing.slug)?.title || HOME_TITLE;
  if (landing?.type === "notfound") return `Nie znaleziono strony | ${BRAND}`;
  return HOME_TITLE;
}
