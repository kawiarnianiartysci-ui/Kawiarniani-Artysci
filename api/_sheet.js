// ══════════════════════════════════════════════════════════════
// 📊  Arkusz Google po stronie serwera
// ══════════════════════════════════════════════════════════════
// Serwer sam czyta dane partnerów z arkusza — do zapytań (adresy email
// partnerów bierzemy stąd, nie z przeglądarki, żeby nikt nie mógł podać
// dowolnego adresu) i do podstron profili/okazji (tytuły, opisy, zdjęcia dla
// Google i podglądów linków). Linki, parser i zamiana wiersza na obiekt są
// w src/dane.js — dokładnie te same, których używa strona w przeglądarce.
import {
  CSV_RESTAURANTS_URL, CSV_WORKSHOPS_URL, csvToObjects, parseCSV,
  restaurantFromRow, workshopFromRow,
} from "../src/dane.js";

// Kolumny, które NIGDY nie trafiają do przeglądarki (dane kontaktowe
// partnerów — wcześniej były widoczne w kodzie strony dla każdego bota).
const PRIVATE_COLUMNS = ["email"];

// Usuwa prywatne kolumny z tekstu CSV i składa go z powrotem.
function stripPrivate(text) {
  const rows = parseCSV(text);
  if (!rows.length) return text;
  const keep = rows[0].map((h, i) => (PRIVATE_COLUMNS.includes(h.trim()) ? -1 : i)).filter(i => i >= 0);
  const cell = v => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map(r => keep.map(i => cell(r[i] ?? "")).join(",")).join("\n");
}

// Osobna, nieupubliczniona w kodzie zakładka "kontakty" (kolumny: id, email,
// opcjonalnie name — dla wygody Joanny). Jej link CSV jest tylko w zmiennej
// środowiskowej CSV_CONTACTS_URL na Vercelu, nie w publicznym repozytorium.
// Adres stąd ma pierwszeństwo przed kolumną "email" w głównych zakładkach
// (ta zostaje jako zapas, dopóki wszystkie adresy nie zostaną przeniesione).
async function fetchContacts() {
  const url = process.env.CSV_CONTACTS_URL;
  if (!url) return new Map();
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Arkusz (kontakty): ${r.status}`);
    return new Map(csvToObjects(await r.text()).filter(x => x.id && x.email).map(x => [x.id, x.email]));
  } catch (err) {
    console.error(err);
    return new Map();
  }
}
const withContact = contacts => x => (contacts.has(x.id) ? { ...x, email: contacts.get(x.id) } : x);

// Pamięć podręczna na kilka minut — ta sama instancja funkcji obsługuje
// zwykle wiele zapytań z rzędu, nie ma sensu za każdym razem pytać Google'a.
const CACHE_MS = 5 * 60 * 1000;
let cache = null; // { at, restText, workText, restaurants, workshops }

export async function getSheetData() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const [restText, workText, contacts] = await Promise.all([
    fetch(CSV_RESTAURANTS_URL).then(r => { if (!r.ok) throw new Error(`Arkusz (restauracje): ${r.status}`); return r.text(); }),
    fetch(CSV_WORKSHOPS_URL).then(r => { if (!r.ok) throw new Error(`Arkusz (warsztaty): ${r.status}`); return r.text(); }),
    fetchContacts(),
  ]);
  cache = {
    at: Date.now(),
    // Teksty CSV BEZ kolumny email — doklejane do strony (i oddawane przez
    // /api/dane), żeby przeglądarka nie musiała drugi raz pobierać arkusza.
    restText: stripPrivate(restText), workText: stripPrivate(workText),
    // Pełne obiekty (z adresami email) — tylko do użytku na serwerze.
    restaurants: csvToObjects(restText).map(restaurantFromRow).map(withContact(contacts)),
    workshops: csvToObjects(workText).map(workshopFromRow).map(withContact(contacts)),
  };
  return cache;
}
