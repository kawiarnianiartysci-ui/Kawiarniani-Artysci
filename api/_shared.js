import crypto from "crypto";

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "zapytania@kawiarnianiartysci.pl";
export const OWNER_EMAIL = process.env.OWNER_EMAIL || "kawiarnianiartysci@gmail.com";

// Komórka "email" w arkuszu może mieć kilka adresów (np. menadżerka + ogólny
// adres lokalu), rozdzielonych przecinkiem, średnikiem lub spacją — mail idzie
// na wszystkie. Zwraca je połączone ", " (pusty string, gdy żaden nie pasuje).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function parseEmails(value) {
  return String(value || "").split(/[,;\s]+/).map(s => s.trim()).filter(s => s.length <= 200 && EMAIL_RE.test(s)).join(", ");
}

// ══ Ochrona formularzy przed spamem ════════════════════════════
// Bez tego ktoś mógłby zasypać artystów/restauracje fałszywymi zapytaniami
// albo wysyłać przez nas maile na cudze adresy. Trzy proste sita:
//  1. zapytanie musi przyjść z naszej strony (nagłówek Origin),
//  2. ukryte pole "website" (człowiek go nie widzi, bot je wypełnia) albo
//     wysłanie formularza w mniej niż 3 s od otwarcia = bot,
//  3. limit wysyłek z jednego adresu IP (w pamięci funkcji — nie idealny,
//     bo Vercel ma kilka kopii funkcji, ale zatrzymuje zalew z jednego miejsca).
// Zwraca: null (w porządku), "silent" (bot — udajemy sukces, nic nie
// wysyłamy, żeby nie wiedział, że go złapaliśmy) albo { status, error }.
const ALLOWED_ORIGIN = /^https:\/\/((www\.)?kawiarnianiartysci\.(pl|com)|[a-z0-9-]+\.vercel\.app)$/;
const hits = new Map(); // ip -> [czasy wysyłek]
export function spamCheck(req, body, { limit = 5, windowMs = 60 * 60 * 1000 } = {}) {
  const origin = req.headers.origin || "";
  if (IS_PRODUCTION && !ALLOWED_ORIGIN.test(origin)) return { status: 403, error: "Niedozwolone źródło zapytania." };
  if (body && (String(body.website || "").trim() || (typeof body.formMs === "number" && body.formMs < 3000))) return "silent";
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < windowMs);
  if (recent.length >= limit) return { status: 429, error: "Wysłano zbyt wiele wiadomości. Spróbuj ponownie za godzinę albo napisz na " + OWNER_EMAIL + "." };
  recent.push(now);
  hits.set(ip, recent);
  return null;
}

// Wspólny tekst dla klienta: ile się czeka i gdzie pisać, gdy cisza.
export const CLIENT_WAIT_INFO = `<p>Zwykle każda strona odpowiada w ciągu 48 godzin. Jeśli w tym czasie nic od nas nie dostaniesz albo chcesz coś zmienić lub odwołać, napisz do nas na <a href="mailto:${OWNER_EMAIL}" style="color:#432A16;">${OWNER_EMAIL}</a> — zajmiemy się tym.</p>`;

// Ścieżka „bez miejsca" (lokal dobiera Joanna): klient płaci osobno artyście
// i lokalowi — decyzja Joanny z 30.10, powtarzana klientowi i artyście.
export const NO_PLACE_BILLING_INFO = `<p>Miejsce dobierzemy dla Ciebie my, ale rozliczenie jest osobne: za warsztat płacisz bezpośrednio artyście, a za menu — lokalowi, który dla Ciebie znajdziemy.</p>`;

// Krótki nagłówek na górze. Wcześniej prosił „o odpowiedź" także w mailach
// czysto informacyjnych, co myliło (przegląd tekstów 30.10) — gdzie pisać,
// mówi stopka na dole.
const NO_REPLY_HEADER = `<p style="font-size:12px;color:#6B6862;margin:0 0 18px;">Wiadomość z platformy Kawiarniani Artyści.</p>`;

const NO_REPLY_FOOTER =`<hr style="border:none;border-top:1px solid #E0DDD6;margin:28px 0 14px;"><p style="font-size:13px;color:#6B6862;margin:0;">To wiadomość systemowa, wysłana automatycznie przez platformę Kawiarniani Artyści. Masz pytanie, chcesz coś zmienić lub odwołać? Odpisz na tego maila albo napisz na <a href="mailto:${OWNER_EMAIL}" style="color:#432A16;">${OWNER_EMAIL}</a> — wiadomość trafi do Joanny.</p>`;

// ══ Tryb testowy ═══════════════════════════════════════════════
// Vercel ustawia VERCEL_ENV = "production" tylko na żywej stronie
// (kawiarnianiartysci.pl). Wszędzie indziej (wersje podglądowe z innych
// gałęzi, uruchomienie lokalne) działamy w trybie testowym: KAŻDY mail idzie
// wyłącznie do Joanny, z dopiskiem [TEST] i informacją, do kogo poszedłby
// naprawdę — dzięki temu można bezpiecznie przeklikać cały proces zapytania
// bez spamowania artystów, restauracji i klientów.
export const IS_PRODUCTION = process.env.VERCEL_ENV === "production";

// Linki w mailach (akceptuj/odrzuć/potwierdź) na wersji podglądowej prowadzą
// z powrotem do TEJ wersji podglądowej, a nie do żywej strony — inaczej
// kliknięcie w mailu testowym uruchomiłoby prawdziwą wysyłkę na produkcji.
const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
export const SITE_URL = IS_PRODUCTION || !previewHost
  ? (process.env.SITE_URL || "https://www.kawiarnianiartysci.pl")
  : `https://${previewHost}`;

function secret() {
  const s = process.env.INQUIRY_SIGNING_SECRET;
  if (!s) throw new Error("Brak INQUIRY_SIGNING_SECRET w zmiennych środowiskowych.");
  return s;
}

// Każdy podpisany link zapamiętuje, czy powstał w trybie testowym — żywa
// strona odrzuca linki testowe (drugie zabezpieczenie obok SITE_URL powyżej).
export function signPayload(payload) {
  const data = Buffer.from(JSON.stringify({ ...payload, test: IS_PRODUCTION ? undefined : true })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(data).digest("hex");
  return { data, sig };
}

export function verifyAndDecode(data, sig) {
  if (!data || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(data).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    if (IS_PRODUCTION && payload && payload.test) return null;
    return payload;
  } catch {
    return null;
  }
}

// Jedyne miejsce, przez które wychodzą maile — w trybie testowym przekierowuje
// je do Joanny (patrz IS_PRODUCTION wyżej). Błąd pojedynczego maila (np.
// literówka w adresie partnera w arkuszu) jest logowany, ale nie wywraca
// całej wysyłki — pozostałe maile, w tym kopia do Joanny, i tak wychodzą.
// Zwraca true, gdy mail faktycznie został przyjęty do wysyłki.
//
// Adres nadawcy (zapytania@...) do 30.10.2026 nie miał skrzynki — odpowiedź
// przepadała (tak zginęło odwołanie warsztatu w Ptasim Radiu). Dziś poczta
// domeny idzie przez ImprovMX do Gmaila Joanny, ale "Odpowiedz do" i tak
// wskazuje jej skrzynkę, a maile do klientów/partnerów mają na dole dopisek,
// gdzie pisać.
export async function sendEmail(resend, { to: rawTo, subject: rawSubject, html: rawHtml, replyTo = OWNER_EMAIL, ...rest }) {
  // "a@x.pl, b@y.pl" (kilka adresów z arkusza, patrz parseEmails) → lista.
  const toList = String(rawTo).split(/\s*,\s*/).filter(Boolean);
  const to = toList.length > 1 ? toList : rawTo;
  // Temat maila to zwykły tekst, nie HTML — nazwy trzymane "bezpiecznie dla
  // HTML" (np. "Bar &amp; Restaurant") zamieniamy z powrotem na zwykłe znaki.
  const subject = String(rawSubject).replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp:"&", lt:"<", gt:">", quot:'"', "#39":"'" }[e]));
  const html = to === OWNER_EMAIL ? rawHtml : rawHtml.replace(/<body[^>]*>/, bodyTag => `${bodyTag}${NO_REPLY_HEADER}`).replace(/<\/body>/, `${NO_REPLY_FOOTER}</body>`);
  const msg = IS_PRODUCTION
    ? { to, subject, html, replyTo, ...rest }
    : {
        ...rest,
        replyTo,
        to: OWNER_EMAIL,
        subject: `[TEST → ${to}] ${subject}`,
        html: html.replace(/<body[^>]*>/, bodyTag => `${bodyTag}<p style="background:#FFF3CD;padding:10px 14px;border-radius:8px;font-size:13px;">🧪 Mail testowy z wersji podglądowej. Na żywej stronie trafiłby do: <strong>${escapeHtml(to)}</strong></p>`),
      };
  // Resend odrzuca zbyt wiele maili naraz ("rate_limit_exceeded", 429) — w teście
  // 26.10 przy ~11 mailach w sekundę jeden przepadł. Wtedy chwilę czekamy
  // i próbujemy ponownie (do 3 razy), zamiast gubić mail.
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await resend.emails.send(msg);
      const err = result && result.error;
      const rateLimited = err && (err.statusCode === 429 || err.name === "rate_limit_exceeded");
      if (rateLimited && attempt < 3) { await new Promise(r => setTimeout(r, 800 * attempt)); continue; }
      if (!result || err) { console.error("Resend:", msg.to, err); return false; }
      return true;
    } catch (err) {
      console.error("Resend:", msg.to, err);
      return false;
    }
  }
}

// Ucieka znaki specjalne HTML — używane dla wolnego tekstu wpisanego przez
// artystę (propozycja terminów), żeby nie dało się wstrzyknąć znaczników do maila.
export function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

// Jak escapeHtml, ale dodatkowo zamienia nowe linie na <br> — do wielolinijkowego
// pola z propozycją terminów.
export function nl2br(str) {
  return escapeHtml(str).replace(/\r\n|\r|\n/g, "<br>");
}

// Owija treść maila w pełny dokument z deklaracją UTF-8 — bez tego
// niektóre skrzynki źle zgadują kodowanie i polskie znaki zamieniają
// się w "�".
export function emailHtml(bodyContent) {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"></head><body style="font-family:system-ui,-apple-system,sans-serif;color:#1A1A1A;font-size:15px;line-height:1.6;">${bodyContent}</body></html>`;
}

export function htmlPage(title, message) {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#EDEBE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;}
  .box{background:#fff;padding:40px 32px;border-radius:16px;max-width:440px;width:100%;text-align:center;}
  h1{font-size:24px;font-weight:600;color:#1A1A1A;margin:0 0 12px;}
  p{color:#6B6862;font-size:15px;line-height:1.6;margin:0;}
  a.btn{display:inline-block;margin:10px 8px 0;padding:12px 22px;border-radius:9px;text-decoration:none;font-weight:600;font-size:14px;}
  a.accept{background:#432A16;color:#fff;}
  a.decline{background:#999;color:#fff;}
</style>
</head><body><div class="box"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

// Po propozycji innego terminu strony dogadują się same — ta prośba daje
// Joannie szansę dowiedzieć się, czy event jednak się odbędzie.
export const NEW_DATE_INFO = `<p>Gdy ustalicie nowy termin, dajcie nam proszę znać na <a href="mailto:${OWNER_EMAIL}" style="color:#432A16;">${OWNER_EMAIL}</a> — żebyśmy wiedzieli, że event się odbędzie.</p>`;
