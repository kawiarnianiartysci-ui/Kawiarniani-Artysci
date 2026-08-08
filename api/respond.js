import { Resend } from "resend";
import { FROM_EMAIL, OWNER_EMAIL, SITE_URL, htmlPage, verifyAndDecode, signPayload, emailHtml, nl2br } from "./_shared.js";

export default async function handler(req, res) {
  const { action, data, sig, confirm, dates } = req.query;

  if (action !== "accept" && action !== "decline" && action !== "propose") {
    res.status(400).send(htmlPage("Nieprawidłowy link", "Ten link jest nieprawidłowy."));
    return;
  }

  const payload = verifyAndDecode(data, sig);
  if (!payload) {
    res.status(400).send(htmlPage("Nieprawidłowy link", "Ten link jest nieprawidłowy lub wygasł. Skontaktuj się z Joanną, jeśli to się powtarza."));
    return;
  }

  const { clientName, restaurantName, workshopName, date, groupSize, isKidsEvent, kidsCount, adultsCount, kidsPackageName, kidsAmountLabel } = payload;

  // Sekcja doklejana do maili, tylko gdy zapytanie dotyczy eventu dla dzieci —
  // całkowicie nieobecna (pusty string) dla zwykłych zapytań, więc istniejące
  // szablony maili wyglądają identycznie jak dziś.
  const kidsEventBlock = isKidsEvent ? `
      <p><strong>🎈 To zapytanie dotyczy eventu dla dzieci (urodziny/impreza).</strong></p>
      <ul>
        <li>Liczba dzieci: ${kidsCount ?? "-"}</li>
        <li>Liczba dorosłych: ${adultsCount ?? "-"}</li>
        <li>Wybrany pakiet: ${kidsPackageName || "-"}</li>
        <li>Kwota: ${kidsAmountLabel || "do ustalenia"}</li>
      </ul>
    ` : "";

  // === Trzecia ścieżka: artysta proponuje inne terminy zamiast akceptować/odrzucać ===
  // Osobna gałąź, bo (w odróżnieniu od accept/decline) potrzebuje dodatkowego
  // wejścia od artysty (tekst z datami) zanim cokolwiek wyśle — ta strona
  // formularza pełni tu tę samą rolę co krok "potwierdź" dla accept/decline.
  if (action === "propose") {
    const { clientEmail, clientPhone, restaurantEmail, artistEmail, artistName } = payload;
    const proposedDates = (dates || "").trim();
    const isClassic = !!restaurantEmail;

    if (!proposedDates) {
      const details = `<strong>${workshopName || ""}</strong> — ${restaurantName || ""}<br>Pierwotny termin: ${date || "do ustalenia"} · ${isKidsEvent ? `${kidsCount ?? "-"} dzieci + ${adultsCount ?? "-"} dorosłych` : `${groupSize || "-"} os.`} · Klient: ${clientName || ""}`;
      res.status(200).send(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Zaproponuj inne terminy</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#EDEBE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;}
  .box{background:#fff;padding:40px 32px;border-radius:16px;max-width:440px;width:100%;text-align:center;}
  h1{font-size:22px;font-weight:600;color:#1A1A1A;margin:0 0 14px;}
  p{color:#6B6862;font-size:15px;line-height:1.6;margin:0 0 20px;}
  textarea{width:100%;box-sizing:border-box;min-height:110px;border-radius:9px;border:1px solid #ccc;padding:12px;font-size:15px;font-family:inherit;margin:0 0 16px;resize:vertical;}
  button{width:100%;padding:13px 24px;border:none;border-radius:9px;text-decoration:none;font-weight:600;font-size:15px;background:#432A16;color:#fff;cursor:pointer;}
</style>
</head><body><div class="box"><h1>Zaproponuj inne terminy</h1><p>${details}</p>
<form method="GET" action="/api/respond">
  <input type="hidden" name="action" value="propose">
  <input type="hidden" name="data" value="${data}">
  <input type="hidden" name="sig" value="${sig}">
  <textarea name="dates" required placeholder="np. 12.09 po 16:00, 14.09 cały dzień"></textarea>
  <button type="submit">Wyślij propozycję</button>
</form>
</div></body></html>`);
      return;
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sends = [];
      const datesHtml = nl2br(proposedDates);

      const artistContact = `${artistName || "Artysta"}${artistEmail ? ` · ${artistEmail}` : ""}`;
      const clientContact = `${clientName || "Klient"}${clientEmail ? ` · ${clientEmail}` : ""}${clientPhone ? ` · ${clientPhone}` : ""}`;
      const restaurantContact = `${restaurantName || "Restauracja"}${restaurantEmail ? ` · ${restaurantEmail}` : ""}`;

      // Klient: zawsze, jeśli mamy jego adres.
      if (clientEmail) {
        sends.push(resend.emails.send({
          from: FROM_EMAIL,
          to: clientEmail,
          subject: `Nowa propozycja terminu — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć ${clientName || ""},</p>
            ${kidsEventBlock}
            <p>Niestety pierwotny termin (${date || "do ustalenia"}) nie pasuje artyście. Proponuje inne terminy:</p>
            <p><strong>${datesHtml}</strong></p>
            <p>Prosimy ustalić szczegóły bezpośrednio z artystą${isClassic ? " i restauracją" : ""}:</p>
            <ul>
              <li>Artysta: ${artistContact}</li>
              ${isClassic ? `<li>Restauracja: ${restaurantContact}</li>` : ""}
            </ul>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      // Restauracja: tylko w ścieżce klasycznej — ten sam mail pełni też rolę
      // informacji "pierwotny termin odpada, nie trzymajcie stolika w zawieszeniu".
      if (isClassic) {
        sends.push(resend.emails.send({
          from: FROM_EMAIL,
          to: restaurantEmail,
          subject: `Artysta proponuje inny termin — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć!</p>
            ${kidsEventBlock}
            <p>Pierwotny termin (${date || "do ustalenia"}) nie pasuje artyście <strong>${artistName || workshopName || ""}</strong>. Proponuje inne terminy:</p>
            <p><strong>${datesHtml}</strong></p>
            <p>Prosimy ustalić szczegóły bezpośrednio z klientem i artystą — dalsze ustalenia są teraz po Waszej stronie:</p>
            <ul>
              <li>Klient: ${clientContact}</li>
              <li>Artysta: ${artistContact}</li>
            </ul>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      // Artysta: osobne potwierdzenie — on zna już swoje daty, potrzebuje
      // informacji, że sprawa poszła dalej i jest teraz po jego stronie.
      if (artistEmail) {
        sends.push(resend.emails.send({
          from: FROM_EMAIL,
          to: artistEmail,
          subject: `Propozycja terminów przekazana — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć ${artistName || ""}!</p>
            ${kidsEventBlock}
            <p>Przekazaliśmy Twoją propozycję terminów klientowi${isClassic ? " i restauracji" : ""}:</p>
            <p><strong>${datesHtml}</strong></p>
            <p>Sprawa jest teraz po Waszej stronie — ustalcie szczegóły bezpośrednio:</p>
            <ul>
              <li>Klient: ${clientContact}</li>
              ${isClassic ? `<li>Restauracja: ${restaurantContact}</li>` : ""}
            </ul>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      sends.push(resend.emails.send({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `Artysta proponuje inny termin: ${restaurantName || ""} + ${workshopName || ""}`,
        html: emailHtml(`<p>Artysta ${artistName || workshopName || ""} zaproponował inne terminy dla zapytania od ${clientName || ""} (${restaurantName || "bez restauracji"}, pierwotny termin: ${date || "-"}).</p><p>Zaproponowane terminy:<br>${datesHtml}</p>${kidsEventBlock}`),
      }));

      await Promise.all(sends);

      res.status(200).send(htmlPage("Wysłano!", "Przekazaliśmy Twoją propozycję terminów. Dalsze ustalenia są teraz bezpośrednio między Wami."));
    } catch (err) {
      console.error(err);
      res.status(500).send(htmlPage("Błąd", "Coś poszło nie tak przy wysyłce propozycji. Spróbuj ponownie za chwilę lub napisz do Joanny."));
    }
    return;
  }

  const accepted = action === "accept";

  // Krok pośredni — chroni przed przypadkowym "kliknięciem" linku przez skanery
  // bezpieczeństwa w skrzynkach mailowych, które same otwierają linki z maila.
  if (confirm !== "1") {
    const confirmUrl = `/api/respond?action=${action}&data=${encodeURIComponent(data)}&sig=${encodeURIComponent(sig)}&confirm=1`;
    const title = accepted ? "Potwierdź akceptację terminu" : "Potwierdź, że nie możesz";
    const details = `<strong>${workshopName || ""}</strong> — ${restaurantName || ""}<br>Termin: ${date || "do ustalenia"} · ${isKidsEvent ? `${kidsCount ?? "-"} dzieci + ${adultsCount ?? "-"} dorosłych` : `${groupSize || "-"} os.`} · Klient: ${clientName || ""}`;
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
          isKidsEvent: isKidsEvent || undefined,
          kidsCount: isKidsEvent ? kidsCount : undefined,
          adultsCount: isKidsEvent ? adultsCount : undefined,
          kidsPackageName: isKidsEvent ? kidsPackageName : undefined,
          kidsAmountLabel: isKidsEvent ? kidsAmountLabel : undefined,
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
          ? `<p>Dobra wiadomość! <strong>${artistName || workshopName || ""}</strong> potwierdził termin <strong>${date || ""}</strong> dla ${groupSize || "-"} osób — event jest ustalony z obu stron.</p>${kidsEventBlock}${detailsList}${clientContact}${finalizeButtons}<p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`
          : `<p>Niestety <strong>${artistName || workshopName || ""}</strong> nie może w zaproponowanym terminie. Skontaktujemy się z klientem w sprawie innego terminu i damy Wam znać.</p>${kidsEventBlock}<p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`),
      }));
    }

    // Ścieżka "Mam miejsce" (bez restauracji) — po akceptacji nie ma
    // trzeciej strony, która musi jeszcze dogadać szczegóły (confirm.js),
    // więc klient dostaje inny komunikat: artysta przyjął i sam się odezwie,
    // zamiast twardego "termin potwierdzony, do zobaczenia w {restauracji}".
    // Celowo restaurantName, nie restaurantEmail — restauracja mogła zostać
    // wybrana, ale nie mieć maila w arkuszu; to i tak ścieżka klasyczna,
    // klient ma wiedzieć, gdzie się wydarzy event (mail do restauracji i tak
    // zostanie pominięty niżej, niezależnie od tego wyboru tekstu).
    const isClassic = !!restaurantName;

    if (clientEmail) {
      sends.push(resend.emails.send({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: accepted ? "Twój termin został potwierdzony!" : "Aktualizacja Twojego zapytania",
        html: emailHtml(accepted
          ? (isClassic
              ? `<p>Cześć ${clientName || ""}!</p>${kidsEventBlock}<p>Świetna wiadomość — artysta potwierdził Wasz termin (${date || ""}) w ${restaurantName || ""}. Do zobaczenia na evencie!</p><p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`
              : `<p>Cześć ${clientName || ""}!</p>${kidsEventBlock}<p>Świetna wiadomość — artysta <strong>${artistName || workshopName || ""}</strong> przyjął Twoje zapytanie na termin ${date || "do ustalenia"} i skontaktuje się z Tobą wkrótce, żeby ustalić ostatnie szczegóły (np. dojazd).</p><p>Kontakt do artysty: ${artistName || ""}${artistEmail ? ` · ${artistEmail}` : ""}</p><p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`)
          : `<p>Cześć ${clientName || ""},</p>${kidsEventBlock}<p>Niestety artysta nie może w zaproponowanym terminie. Odezwiemy się wkrótce z propozycją innego terminu.</p><p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`),
      }));
    }

    sends.push(resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `${accepted ? "Zaakceptowano" : "Odrzucono"}: ${restaurantName || (isClassic ? "" : "bez restauracji (mam miejsce)")} + ${workshopName || ""}`,
      html: emailHtml(`<p>Artysta ${accepted ? "zaakceptował" : "odrzucił"} zapytanie od ${clientName || ""} (${isClassic ? restaurantName || "" : "bez restauracji — mam miejsce"}, ${date || ""}).</p>${kidsEventBlock}`),
    }));

    await Promise.all(sends);

    res.status(200).send(
      accepted
        ? htmlPage("Dziękujemy!", isClassic ? "Potwierdziłeś/aś termin. Restauracja i klient zostali poinformowani mailowo." : "Potwierdziłeś/aś termin. Klient został poinformowany mailowo i dostał Twój kontakt.")
        : htmlPage("Zapisano", isClassic ? "Poinformowaliśmy restaurację i klienta, że nie możesz w tym terminie." : "Poinformowaliśmy klienta, że nie możesz w tym terminie.")
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(htmlPage("Błąd", "Coś poszło nie tak przy wysyłce potwierdzenia. Spróbuj ponownie za chwilę lub napisz do Joanny."));
  }
}
