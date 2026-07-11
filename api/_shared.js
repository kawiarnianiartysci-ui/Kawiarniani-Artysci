import crypto from "crypto";

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "zapytania@kawiarnianiartysci.pl";
export const OWNER_EMAIL = process.env.OWNER_EMAIL || "kawiarnianiartysci@gmail.com";
export const SITE_URL = process.env.SITE_URL || "https://www.kawiarnianiartysci.pl";

function secret() {
  const s = process.env.INQUIRY_SIGNING_SECRET;
  if (!s) throw new Error("Brak INQUIRY_SIGNING_SECRET w zmiennych środowiskowych.");
  return s;
}

export function signPayload(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
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
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
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
