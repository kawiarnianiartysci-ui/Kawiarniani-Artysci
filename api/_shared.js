import crypto from "crypto";

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "zapytania@kawiarnianiartysci.pl";
export const OWNER_EMAIL = process.env.OWNER_EMAIL || "kawiarnianiartysci@gmail.com";

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
export async function sendEmail(resend, { to, subject: rawSubject, html, ...rest }) {
  // Temat maila to zwykły tekst, nie HTML — nazwy trzymane "bezpiecznie dla
  // HTML" (np. "Bar &amp; Restaurant") zamieniamy z powrotem na zwykłe znaki.
  const subject = String(rawSubject).replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp:"&", lt:"<", gt:">", quot:'"', "#39":"'" }[e]));
  const msg = IS_PRODUCTION
    ? { to, subject, html, ...rest }
    : {
        ...rest,
        to: OWNER_EMAIL,
        subject: `[TEST → ${to}] ${subject}`,
        html: html.replace(/<body[^>]*>/, bodyTag => `${bodyTag}<p style="background:#FFF3CD;padding:10px 14px;border-radius:8px;font-size:13px;">🧪 Mail testowy z wersji podglądowej. Na żywej stronie trafiłby do: <strong>${escapeHtml(to)}</strong></p>`),
      };
  try {
    const result = await resend.emails.send(msg);
    if (!result || result.error) { console.error("Resend:", msg.to, result && result.error); return false; }
    return true;
  } catch (err) {
    console.error("Resend:", msg.to, err);
    return false;
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
