import { Resend } from "resend";
import { FROM_EMAIL, OWNER_EMAIL, SITE_URL, htmlPage, verifyAndDecode, signPayload, emailHtml } from "./_shared.js";

export default async function handler(req, res) {
  const { action, data, sig, confirm } = req.query;

  if (action !== "accept" && action !== "decline") {
    res.status(400).send(htmlPage("Nieprawidłowy link", "Ten link jest nieprawidłowy."));
    return;
  }

  const payload = verifyAndDecode(data, sig);
  if (!payload) {
    res.status(400).send(htmlPage("Nieprawidłowy link", "Ten link jest nieprawidłowy lub wygasł. Skontaktuj się z Joanną, jeśli to się powtarza."));
    return;
  }

  const accepted = action === "accept";
  const { clientName, restaurantName, workshopName, date, groupSize } = payload;

  // Krok pośredni — chroni przed przypadkowym "kliknięciem" linku przez skanery
  // bezpieczeństwa w skrzynkach mailowych, które same otwierają linki z maila.
  if (confirm !== "1") {
    const confirmUrl = `/api/respond?action=${action}&data=${encodeURIComponent(data)}&sig=${encodeURIComponent(sig)}&confirm=1`;
    const title = accepted ? "Potwierdź akceptację terminu" : "Potwierdź, że nie możesz";
    const details = `<strong>${workshopName || ""}</strong> — ${restaurantName || ""}<br>Termin: ${date || "do ustalenia"} · ${groupSize || "-"} os. · Klient: ${clientName || ""}`;
    res.status(200).send(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#EDEBE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;}
  .box{background:#fff;padding:40px 32px;border-radius:16px;max-width:440px;width:100%;text-align:center;}
  h1{font-size:22px;font-weight:600;color:#1A1A1A;margin:0 0 14px;}
  p{color:#6B6862;font-size:15px;line-height:1.6;margin:0 0 20px;}
  a.btn{display:inline-block;padding:13px 24px;border-radius:9px;text-decoration:none;font-weight:600;font-size:15px;background:${accepted ? "#432A16" : "#999"};color:#fff;}
</style>
</head><body><div class="box"><h1>${title}</h1><p>${details}</p><a class="btn" href="${confirmUrl}">${accepted ? "Tak, akceptuję ten termin" : "Tak, nie mogę w tym terminie"}</a></div></body></html>`);
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { clientEmail, clientPhone, restaurantEmail, artistEmail, artistName, artistInvoicing, artistRequirements } = payload;
    const sends = [];

    if (restaurantEmail) {
      const detailsList = accepted && (artistInvoicing || artistRequirements)
        ? `<ul>${artistInvoicing ? `<li>${artistInvoicing}</li>` : ""}${artistRequirements ? `<li>${artistRequirements}</li>` : ""}</ul>`
        : "";
      const clientContact = accepted
        ? `<p>Kontakt do klienta (np. w sprawie menu):<br>${clientName || ""}${clientEmail ? ` · ${clientEmail}` : ""}${clientPhone ? ` · ${clientPhone}` : ""}</p>`
        : "";
      // Gdy artysta zaakceptował, restauracja musi jeszcze dogadać szczegóły
      // z klientem — ten drugi, osobno podpisany link daje jej możliwość
      // ostatecznego potwierdzenia lub zgłoszenia, że jednak się nie udało.
      let finalizeButtons = "";
      if (accepted) {
        const confirmPayload = {
          clientName, clientEmail: clientEmail || "", clientPhone: clientPhone || "",
          restaurantName, restaurantEmail,
          artistName: artistName || "", workshopName: workshopName || "", artistEmail: artistEmail || "",
          date: date || "", groupSize: groupSize || "",
          ts: Date.now(),
        };
        const { data: cData, sig: cSig } = signPayload(confirmPayload);
        const confirmUrl = `${SITE_URL}/api/confirm?action=confirm&data=${cData}&sig=${cSig}`;
        const cancelUrl = `${SITE_URL}/api/confirm?action=cancel&data=${cData}&sig=${cSig}`;
        finalizeButtons = `
          <p>Gdy dogadacie się z klientem co do ostatnich szczegółów, dajcie nam znać:</p>
          <p>
            <a href="${confirmUrl}" style="background:#432A16;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;margin-right:10px;display:inline-block;">Potwierdzam — wszystko ustalone</a>
            <a href="${cancelUrl}" style="background:#999;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Nieaktualne — nie udało się dogadać</a>
          </p>
        `;
      }
      sends.push(resend.emails.send({
        from: FROM_EMAIL,
        to: restaurantEmail,
        subject: accepted
          ? `Potwierdzone! ${workshopName || ""} — ${date || ""}`
          : `Artysta nie może w tym terminie — ${workshopName || ""}`,
        html: emailHtml(accepted
          ? `<p>Dobra wiadomość! <strong>${artistName || workshopName || ""}</strong> potwierdził termin <strong>${date || ""}</strong> dla ${groupSize || "-"} osób — event jest ustalony z obu stron.</p>${detailsList}${clientContact}${finalizeButtons}<p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`
          : `<p>Niestety <strong>${artistName || workshopName || ""}</strong> nie może w zaproponowanym terminie. Skontaktujemy się z klientem w sprawie innego terminu i damy Wam znać.</p><p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`),
      }));
    }

    if (clientEmail) {
      sends.push(resend.emails.send({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: accepted ? "Twój termin został potwierdzony!" : "Aktualizacja Twojego zapytania",
        html: emailHtml(accepted
          ? `<p>Cześć ${clientName || ""}!</p><p>Świetna wiadomość — artysta potwierdził Wasz termin (${date || ""}) w ${restaurantName || ""}. Do zobaczenia na evencie!</p><p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`
          : `<p>Cześć ${clientName || ""},</p><p>Niestety artysta nie może w zaproponowanym terminie. Odezwiemy się wkrótce z propozycją innego terminu.</p><p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`),
      }));
    }

    sends.push(resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `${accepted ? "Zaakceptowano" : "Odrzucono"}: ${restaurantName || ""} + ${workshopName || ""}`,
      html: emailHtml(`<p>Artysta ${accepted ? "zaakceptował" : "odrzucił"} zapytanie od ${clientName || ""} (${restaurantName || ""}, ${date || ""}).</p>`),
    }));

    await Promise.all(sends);

    res.status(200).send(
      accepted
        ? htmlPage("Dziękujemy!", "Potwierdziłeś/aś termin. Restauracja i klient zostali poinformowani mailowo.")
        : htmlPage("Zapisano", "Poinformowaliśmy restaurację i klienta, że nie możesz w tym terminie.")
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(htmlPage("Błąd", "Coś poszło nie tak przy wysyłce potwierdzenia. Spróbuj ponownie za chwilę lub napisz do Joanny."));
  }
}
