// ══════════════════════════════════════════════════════════════
// 📊  DANE Z ARKUSZA — wspólne dla strony (src/App.jsx) i serwera (api/)
// ══════════════════════════════════════════════════════════════
// Jedno miejsce, które wie, jak czytać arkusz Google: linki do opublikowanych
// CSV, parser i zamiana wiersza arkusza na obiekt restauracji/warsztatu.
// Używa go zarówno przeglądarka (lista, profile, kreator), jak i funkcje na
// Vercelu (podstrony profili dla Google/Facebooka, sitemap, zapytania) —
// dzięki temu obie strony zawsze rozumieją arkusz dokładnie tak samo.
//
// Jak dodać nową restaurację/warsztat:
//  1. Wgraj zdjęcia do public/images/ (np. przez przeglądarkę GitHub).
//  2. Zduplikuj wiersz w odpowiedniej zakładce arkusza, wpisz dane
//     i nazwy wgranych plików (bez ścieżki, np. "moje-zdjecie.jpg").
// Zmiana pojawi się na stronie po odświeżeniu (do kilku minut na
// odświeżenie publikacji arkusza przez Google).
export const CSV_RESTAURANTS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj-im-saKt9v_ANh2m42skFGZrBDRhckh5OjESFVhAk6vPcAg5M8m20xAB3RTAqlRsizOa_9ken2t_/pub?gid=563383430&single=true&output=csv";
export const CSV_WORKSHOPS_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj-im-saKt9v_ANh2m42skFGZrBDRhckh5OjESFVhAk6vPcAg5M8m20xAB3RTAqlRsizOa_9ken2t_/pub?gid=273766010&single=true&output=csv";

export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some(v => v !== "")) rows.push(row); }
  return rows;
}

export function csvToObjects(text) {
  const [header, ...body] = parseCSV(text);
  if (!header) return [];
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export const toNum  = v => (v === "" || v == null ? null : Number(v));
export const toBool = v => /^(true|1|tak|prawda)$/i.test((v || "").trim());
// jak toBool, ale puste pole zostaje "nieznane" zamiast fałszu —
// potrzebne tam, gdzie samo "puste" i "jawnie nie" muszą się różnić
export const toTriBool = v => {
  const t = (v || "").trim();
  return t === "" ? undefined : toBool(t);
};
export const imgPath = filename => (filename ? `/images/${filename.trim()}` : undefined);
export const imgListPath = list => !list ? [] : list.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
  const [filename, ...mods] = entry.split("@");
  if (mods.length === 0) return imgPath(filename);
  const obj = { src: imgPath(filename) };
  mods.forEach(m => { const [k, v] = m.split("="); obj[k.trim()] = v?.trim(); });
  return obj;
});
export const splitList = text => (text ? text.split(";").filter(Boolean) : []);
export const parseVariants = text => splitList(text).map(part => {
  const [id, label, detail, price, priceMax] = part.split("|");
  const v = { id, label, detail, price: price ? Number(price) : null };
  if (priceMax) v.priceMax = Number(priceMax);
  return v;
});
// Wyciąga liczbę godzin z tekstu typu "2 godz.", "1,5 godz." albo "2-3 godz"
// (zakres — bierzemy górną granicę, żeby nie umówić warsztatu, który realnie
// nie zdąży się skończyć przed zamknięciem lokalu). Używane tylko do
// wyliczenia godziny zamknięcia, nie do wyświetlania (na to zostaje `duration`).
export const parseDurationHours = text => {
  const nums = (text || "").replace(/,/g, ".").match(/\d+(\.\d+)?/g);
  return nums ? Math.max(...nums.map(Number)) : 0;
};
// "HH:MM" -> minuty od północy, do porównań czasu.
export const timeToMinutes = t => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

// Godziny otwarcia lokalu, różne dla każdego dnia tygodnia — jedna kolumna
// w arkuszu ("hours"), format: "pon=15:00-21:00;wt=15:00-21:00;sr=;czw=...".
// Pusty zakres po "=" (albo brak dnia w tekście) = lokal zamknięty w ten dzień.
// Brak kolumny w ogóle (pusty tekst) = brak danych, filtr godzin nieaktywny.
export const DAY_KEYS = ["nd", "pon", "wt", "sr", "czw", "pt", "sob"]; // index = Date.getDay()
export const parseHours = text => {
  const byDay = {};
  splitList(text).forEach(part => {
    const [day, range] = part.split("=");
    if (!day) return;
    if (range) {
      const [open, close] = range.split("-");
      if (open && close) byDay[day.trim()] = { open: open.trim(), close: close.trim() };
    } else {
      byDay[day.trim()] = null; // jawnie zamknięte
    }
  });
  return byDay;
};
// "YYYY-MM-DD" -> klucz dnia tygodnia ("pon".."nd"), bez przesunięć strefy
// czasowej (stąd ręczne rozbicie zamiast new Date(string)).
export const dayKeyFromDate = dateStr => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAY_KEYS[new Date(y, m - 1, d).getDay()];
};

// ══ Adresy profili ("slug") ══════════════════════════════════
// Slug to końcówka adresu profilu, np. "ebru-marbled-minds" w
// kawiarnianiartysci.pl/warsztaty/ebru-marbled-minds. Joanna wpisuje go w
// kolumnie "slug" arkusza; gdy komórka jest pusta, robimy go automatycznie
// z kolumny "id" (małe litery, bez polskich znaków, spacje/ukośniki → "-").
// Ta sama funkcja "czyści" też to, co wpisano w kolumnie slug, więc literówka
// typu wielka litera czy spacja nie zepsuje adresu.
const PL_CHARS = { ą:"a", ć:"c", ę:"e", ł:"l", ń:"n", ó:"o", ś:"s", ź:"z", ż:"z" };
export const slugify = text => String(text || "")
  .toLowerCase()
  .replace(/[ąćęłńóśźż]/g, ch => PL_CHARS[ch])
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const rowSlug = row => slugify(row.slug) || slugify(row.id);

export function restaurantFromRow(row) {
  const photos = imgListPath(row.photos);
  const cover = photos[0] ? (typeof photos[0] === "string" ? photos[0] : photos[0].src) : undefined;
  return {
    id: row.id, slug: rowSlug(row), name: row.name, comingSoon: toBool(row.comingSoon) || undefined,
    logo: imgPath(row.logo), photo: cover, photos,
    vibe: row.vibe, location: row.location, description: row.description, fullDescription: row.fullDescription,
    tagline: row.tagline || undefined,
    capacity: row.capacity, minPeople: toNum(row.minPeople), maxPeople: toNum(row.maxPeople),
    address: row.address, website: row.website, instagram: row.instagram,
    instagramUrl: row.instagramUrl || undefined, facebookUrl: row.facebookUrl || undefined,
    hasSeparateRoom: toBool(row.hasSeparateRoom) || undefined,
    variants: parseVariants(row.variants),
    email: row.email || undefined,
    requiresInvoice: toBool(row.requiresInvoice) || undefined,
    hours: parseHours(row.hours),
    acceptsKids: toBool(row.acceptsKids) || undefined,
    kidsVariants: parseVariants(row.kidsVariants),
  };
}

export function workshopFromRow(row) {
  return {
    id: row.id, slug: rowSlug(row), name: row.name, comingSoon: toBool(row.comingSoon) || undefined,
    logo: imgPath(row.logo), photo: imgPath(row.photo), photos: imgListPath(row.photos),
    artist: row.artist, bio: row.bio, duration: row.duration, pricePerPerson: toNum(row.pricePerPerson),
    minPeople: toNum(row.minPeople), maxPeople: toNum(row.maxPeople),
    description: row.description, includes: splitList(row.includes),
    website: row.website, instagram: row.instagram,
    instagramUrl: row.instagramUrl || undefined, facebookUrl: row.facebookUrl || undefined,
    email: row.email || undefined, gradientBg: row.gradientBg, gradientText: row.gradientText,
    requiresSeparateRoom: toBool(row.requiresSeparateRoom) || undefined,
    invoicing: row.invoicing || undefined, requirements: row.requirements || undefined,
    canInvoice: toTriBool(row.canInvoice),
    forKids: toBool(row.forKids) || undefined,
    kidsMinAge: toNum(row.kidsMinAge) ?? undefined,
    // Warsztat dedykowany wyłącznie dzieciom (np. ElektroLab) — niewidoczny
    // w zwykłej ścieżce "Planuję event", tylko w trybie "Eventy dla dzieci".
    // Analogicznie do pustych `variants` u restauracji tylko-dla-dzieci.
    kidsOnly: toBool(row.kidsOnly) || undefined,
    // Wyłącznik ścieżki "Mam miejsce" (artysta dojeżdża do klienta) — tylko
    // artyści z travelsToClient=tak są tam wybieralni, patrz withOwnPlaceTile w App().
    travelsToClient: toTriBool(row.travelsToClient),
    travelArea: row.travelArea || undefined,
  };
}
