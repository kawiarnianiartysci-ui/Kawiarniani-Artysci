import { Resend } from "resend";
import { FROM_EMAIL, OWNER_EMAIL, htmlPage, verifyAndDecode, emailHtml } from "./_shared.js";

// Restauracja może potrzebować kilku dni na dogadanie szczegółów z klientem,
// więc ten link żyje wyraźnie dłużej niż typowy link akceptacji/odrzucenia —
// nie godzinę czy dwie, tylko około tygodnia.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  const { action, data, sig, confirm } = req.query;

  if (action !== "confirm" && action !== "cancel") {
    res.status(400).send(htmlPage("Nieprawidłowy link", "Ten link jest nieprawidłowy."));
    return;
  }

  const payload = verifyAndDecode(data, sig);
  if (!payload || typeof payload.ts !== "number" || Date.now() - payload.ts > MAX_AGE_MS) {
    res.status(400).send(htmlPage("Link wygasł", "Ten link jest nieprawidłowy lub wygasł (jest ważny około tygodnia od akceptacji artysty). Skontaktuj się z Joanną, jeśli potrzebujesz pomocy."));
    return;
  }

  const confirmed = action === "confirm";
  const { clientName, restaurantName, workshopName, date, groupSize } = payload;

  // Krok pośredni — jak w /api/respond, chroni przed przypadkowym "kliknięciem"
  // linku przez skanery bezpieczeństwa w skrzynkach mailowych.
  if (confirm !== "1") {
    const confirmUrl = `/api/confirm?action=${action}&data=${encodeURIComponent(data)}&sig=${encodeURIComponent(sig)}&confirm=1`;
    const title = confirmed ? "Potwierdź, że wszystko ustalone" : "Potwierdź, że zapytanie nie doszło do skutku";
    const details = `<strong>${workshopName || ""}</strong> — ${restaurantName || ""}<br>Termin: ${date || "do ustalenia"} · ${groupSize || "-"} os. · Klient: ${clientName || ""}`;
    res.status(200).send(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#EDEBE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;}
  .box{background:#fff;padding:40px 32px;border-radius:16px;max-width:440px;width:100%;text-align:center;}
  h1{font-size:22px;font-weight:600;color:#1A1A1A;margin:0 0 14px;}
  p{color:#6B6862;font-size:15px;line-height:1.6;margin:0 0 20px;}
  a.btn{display:inline-block;padding:13px 24px;border-radius:9px;text-decoration:none;font-weight:600;font-size:15px;background:${confirmed ? "#432A16" : "#999"};color:#fff;}
</style>
</head><body><div class="box"><h1>${title}</h1><p>${details}</p><a class="btn" href="${confirmUrl}">${confirmed ? "Tak, wszystko ustalone" : "Tak, nie udało się dogadać"}</a></div></body></html>`);
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { clientEmail, clientPhone, artistEmail, artistName } = payload;
    const sends = [];

    if (confirmed) {
      // Artysta — może bezpiecznie zablokować termin, bez ryzyka odwołania.
      if (artistEmail) {
        sends.push(resend.emails.send({
          from: FROM_EMAIL,
          to: artistEmail,
          subject: `Termin ostatecznie potwierdzony — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć ${artistName || ""}!</p>
            <p>Restauracja <strong>${restaurantName || ""}</strong> potwierdziła, że wszystko jest ustalone z klientem. Termin <strong>${date || ""}</strong> jest już ostateczny — możesz go śmiało zablokować w kalendarzu, bez ryzyka odwołania.</p>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      if (clientEmail) {
        sends.push(resend.emails.send({
          from: FROM_EMAIL,
          to: clientEmail,
          subject: "Twoja rezerwacja jest potwierdzona!",
          html: emailHtml(`
            <p>Cześć ${clientName || ""}!</p>
            <p>Wszystko ustalone — Wasza rezerwacja jest potwierdzona:</p>
            <ul>
              <li>Warsztat: ${workshopName || "-"}</li>
              <li>Miejsce: ${restaurantName || "-"}</li>
              <li>Termin: ${date || "do ustalenia"}</li>
              <li>Liczba osób: ${groupSize || "-"}</li>
            </ul>
            <p>Do zobaczenia na evencie!</p>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      sends.push(resend.emails.send({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `Potwierdzone ostatecznie: ${restaurantName || ""} + ${workshopName || ""}`,
        html: emailHtml(`<p>Restauracja potwierdziła, że wszystko ustalone z klientem ${clientName || ""} (${restaurantName || ""}, ${date || ""}, ${groupSize || "-"} os.).</p>`),
      }));
    } else {
      // Artysta — najważniejsza wiadomość w tym kroku: bez niej zostaje
      // z nieaktualną rezerwacją w kalendarzu, więc idzie jako pierwsza.
      if (artistEmail) {
        sends.push(resend.emails.send({
          from: FROM_EMAIL,
          to: artistEmail,
          subject: `To zapytanie jednak nie doszło do skutku — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć ${artistName || ""}!</p>
            <p>Restauracja <strong>${restaurantName || ""}</strong> nie dogadała się z klientem co do szczegółów i to zapytanie (termin: ${date || "-"}) jednak nie dojdzie do skutku. Możesz spokojnie zwolnić ten termin w swoim kalendarzu.</p>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      sends.push(resend.emails.send({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `Nie doszło do skutku: ${restaurantName || ""} + ${workshopName || ""}`,
        html: emailHtml(`<p>Restauracja <strong>${restaurantName || ""}</strong> zgłosiła, że nie udało się dogadać szczegółów z klientem ${clientName || ""}${clientEmail ? ` (${clientEmail}${clientPhone ? ", " + clientPhone : ""})` : ""} — warsztat ${workshopName || "-"}, termin ${date || "-"}. Warto ręcznie zareagować, np. zaproponować klientowi alternatywny termin.</p>`),
      }));
    }

    await Promise.all(sends);

    res.status(200).send(
      confirmed
        ? htmlPage("Dziękujemy!", "Potwierdziliście rezerwację. Artysta i klient zostali poinformowani mailowo.")
        : htmlPage("Dziękujemy!", "Damy znać Joannie i artyście.")
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(htmlPage("Błąd", "Coś poszło nie tak przy wysyłce. Spróbuj ponownie za chwilę lub napisz do Joanny."));
  }
}
