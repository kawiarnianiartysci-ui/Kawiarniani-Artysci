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
      "Wieczór panieński nie musi oznaczać głośnego klubu. Możecie spotkać się przy stole w kameralnej poznańskiej kawiarni albo restauracji, a artystka lub artysta poprowadzi Was przez warsztat — malowanie, ebru, mozaikę, świece, zapachy i wiele innych.",
      "Każda z Was wychodzi z czymś, co zrobiła własnymi rękami — pamiątką z tego dnia. A pomiędzy jest czas na rozmowę, śmiech i coś dobrego do jedzenia i picia.",
      "Jak to działa? Wybierasz warsztat i miejsce (albo zapraszasz artystę do siebie), podajesz termin i liczbę osób, a my przekazujemy zapytanie artyście i lokalowi i wracamy z odpowiedzią.",
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
      "Szukasz pomysłu na urodziny, które goście zapamiętają na dłużej niż jeden wieczór? Zamiast samej kolacji — kolacja i wspólny warsztat artystyczny, prowadzony przez artystę przy Waszym stole.",
      "Nie trzeba umieć malować ani mieć „zdolności manualnych”. Warsztaty są przygotowane tak, żeby każdy dobrze się bawił i wyszedł z własną pracą.",
      "Wybierz warsztat i miejsce w Poznaniu (albo zaproś artystę do siebie), podaj termin i liczbę gości — resztę ustalimy razem z artystą i lokalem.",
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
      "Urodziny, na których dzieci nie tylko jedzą tort, ale też coś razem tworzą. Artysta prowadzi warsztat dopasowany do wieku dzieci, a dorośli mogą spokojnie usiąść obok przy kawie.",
      "Na tej stronie znajdziesz warsztaty przygotowane dla dzieci i miejsca w Poznaniu, które przyjmują dziecięce urodziny. Przy każdym warsztacie widać, od jakiego wieku jest przeznaczony.",
      "Podaj liczbę dzieci i dorosłych, wybierz warsztat i miejsce (albo zaproś artystę do siebie), a my przekażemy zapytanie i wrócimy z odpowiedzią.",
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
      "Integracja nie musi oznaczać wyjazdu ani wielkiej imprezy. Wystarczy wspólne popołudnie lub wieczór przy stole, w którym zespół razem coś tworzy — z artystą, który wszystko prowadzi.",
      "Wspólny warsztat to dobra okazja, żeby porozmawiać poza tematami z pracy i zobaczyć się nawzajem z innej strony. Każdy wychodzi z własną pracą.",
      "Możecie wybrać kawiarnię lub restaurację z listy albo zaprosić artystę do siebie. Jeśli potrzebujecie faktury, napiszcie o tym w uwagach do zapytania.",
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
      "Baby shower to spotkanie w bliskim gronie — i właśnie w takim klimacie najlepiej sprawdza się wspólny warsztat przy stole, w spokojnej poznańskiej kawiarni albo restauracji.",
      "Artystka lub artysta przygotowuje wszystko, czego potrzeba, a Wy możecie skupić się na byciu razem. Na koniec zostaje pamiątka zrobiona własnymi rękami.",
      "Wybierz warsztat i miejsce (albo zaproś artystę do siebie), podaj termin i liczbę gości — przekażemy zapytanie i wrócimy z odpowiedzią.",
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
