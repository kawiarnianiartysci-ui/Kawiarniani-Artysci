import { Resend } from "resend";
import { FROM_EMAIL, OWNER_EMAIL, IS_PRODUCTION, SITE_URL, escapeHtml, nl2br, htmlPage, verifyAndDecode, emailHtml, sendEmail, NEW_DATE_INFO } from "./_shared.js";

// Restauracja może potrzebować kilku dni na odpowiedź, więc ten link żyje
// wyraźnie dłużej niż typowy link akceptacji/odrzucenia — około tygodnia.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Powody odmowy do wyboru przez restaurację — wybrany trafia do klienta.
// "other" = własny tekst restauracji, przekazywany klientowi tak, jak wpisany.
const DECLINE_REASONS = {
  booked:    { label: "Lokal ma już rezerwację w tym terminie", client: "W tym terminie lokal ma już inną rezerwację." },
  exclusive: { label: "Lokal jest wynajęty na wyłączność",       client: "W tym terminie lokal jest wynajęty na wyłączność." },
  closed:    { label: "Lokal jest w tym czasie zamknięty",       client: "W tym terminie lokal jest nieczynny." },
  other:     { label: "Inny powód (wpisz poniżej)",              client: "" },
};

const PAGE_STYLE = `
  body{font-family:system-ui,-apple-system,sans-serif;background:#EDEBE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;}
  .box{background:#fff;padding:40px 32px;border-radius:16px;max-width:440px;width:100%;text-align:center;}
  h1{font-size:22px;font-weight:600;color:#1A1A1A;margin:0 0 14px;}
  p{color:#6B6862;font-size:15px;line-height:1.6;margin:0 0 20px;}
  a.btn,button{display:inline-block;width:auto;padding:13px 24px;border:none;border-radius:9px;text-decoration:none;font-weight:600;font-size:15px;background:#432A16;color:#fff;cursor:pointer;font-family:inherit;}
  button{width:100%;}
  textarea{width:100%;box-sizing:border-box;min-height:100px;border-radius:9px;border:1px solid #ccc;padding:12px;font-size:15px;font-family:inherit;margin:0 0 16px;resize:vertical;}
  label.opt{display:block;text-align:left;padding:10px 12px;border:1px solid #E0DDD6;border-radius:9px;margin:0 0 8px;font-size:15px;color:#1A1A1A;cursor:pointer;}
  .hint{font-size:13px;margin:4px 0 16px;text-align:left;}
`;
const page = (title, inner) => `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${PAGE_STYLE}</style></head><body><div class="box"><h1>${title}</h1>${inner}</div></body></html>`;

async function obsluz(req, res) {
  let { action, data, sig, confirm, dates, reason, note } = req.query;
  // "cancel" = przycisk ze starszych maili („Nieaktualne — nie udało się
  // dogadać"); takie linki wciąż leżą w skrzynkach restauracji, więc
  // prowadzą teraz do tego samego formularza odmowy.
  if (action === "cancel") action = "decline";

  if (action !== "confirm" && action !== "decline" && action !== "propose") {
    res.status(400).send(htmlPage("Nieprawidłowy link", "Ten link jest nieprawidłowy."));
    return;
  }

  const payload = verifyAndDecode(data, sig);
  if (!payload || typeof payload.ts !== "number" || Date.now() - payload.ts > MAX_AGE_MS) {
    res.status(400).send(htmlPage("Link wygasł", `Ten link jest nieprawidłowy lub wygasł (jest ważny około tygodnia od akceptacji artysty). Napisz do nas na ${OWNER_EMAIL}, a pomożemy.`));
    return;
  }

  const { clientName, restaurantName, workshopName, date, groupSize, isKidsEvent, kidsCount, adultsCount, kidsPackageName, kidsAmountLabel } = payload;
  const { clientEmail, clientPhone, restaurantEmail, artistEmail, artistName } = payload;

  // Sekcja doklejana do maili, tylko gdy zapytanie dotyczy eventu dla dzieci —
  // całkowicie nieobecna (pusty string) dla zwykłych zapytań.
  const kidsEventBlock = isKidsEvent ? `
      <p><strong>🎈 To zapytanie dotyczy eventu dla dzieci (urodziny/impreza).</strong></p>
      <ul>
        <li>Liczba dzieci: ${kidsCount ?? "-"}</li>
        <li>Liczba dorosłych: ${adultsCount ?? "-"}</li>
        <li>Wybrany pakiet: ${kidsPackageName || "-"}</li>
        <li>Kwota: ${kidsAmountLabel || "do ustalenia"}</li>
      </ul>
    ` : "";

  const details = `<strong>${workshopName || ""}</strong> — ${restaurantName || ""}<br>Termin: ${date || "do ustalenia"} · ${isKidsEvent ? `${kidsCount ?? "-"} dzieci + ${adultsCount ?? "-"} dorosłych` : `${groupSize || "-"} os.`} · Klient: ${clientName || ""}`;
  const hidden = `<input type="hidden" name="action" value="${action}"><input type="hidden" name="data" value="${escapeHtml(data)}"><input type="hidden" name="sig" value="${escapeHtml(sig)}">`;

  const artistContact = `${artistName || "Artysta"}${artistEmail ? ` · ${artistEmail}` : ""}`;
  const clientContact = `${clientName || "Klient"}${clientEmail ? ` · ${clientEmail}` : ""}${clientPhone ? ` · ${clientPhone}` : ""}`;
  const restaurantContact = `${restaurantName || "Restauracja"}${restaurantEmail ? ` · ${restaurantEmail}` : ""}`;
  const newInquiryLink = `<a href="${SITE_URL}" style="color:#432A16;">kawiarnianiartysci.pl</a>`;

  // Krok pośredni przed wysyłką — chroni przed przypadkowym "kliknięciem"
  // linku przez skanery bezpieczeństwa w skrzynkach mailowych. Przy odmowie
  // i propozycji terminu pełni go formularz (powód / daty).
  if (action === "confirm" && confirm !== "1") {
    const confirmUrl = `/api/confirm?action=confirm&data=${encodeURIComponent(data)}&sig=${encodeURIComponent(sig)}&confirm=1`;
    res.status(200).send(page("Potwierdź rezerwację terminu", `<p>${details}</p><p>Potwierdzasz, że termin jest u Was wolny i go rezerwujecie. Menu i ostateczną cenę ustalicie z klientem w kolejnym kroku.</p><a class="btn" href="${confirmUrl}">Tak, rezerwuję ten termin</a>`));
    return;
  }

  const reasonKey = DECLINE_REASONS[reason] ? reason : "";
  if (action === "decline" && !reasonKey) {
    const options = Object.entries(DECLINE_REASONS).map(([k, r], i) => `<label class="opt"><input type="radio" name="reason" value="${k}" ${i === 0 ? "required" : ""}> ${r.label}</label>`).join("");
    res.status(200).send(page("Odrzuć zapytanie", `<p>${details}</p>
<form method="GET" action="/api/confirm">${hidden}
  ${options}
  <p class="hint">Wybrany powód przekażemy klientowi w uprzejmym mailu.</p>
  <textarea name="note" placeholder="Inny powód lub dodatkowa informacja dla klienta (opcjonalnie)"></textarea>
  <p class="hint"><strong>Uwaga:</strong> to, co tu wpiszesz, trafi do klienta dokładnie w tej formie.</p>
  <button type="submit">Wyślij odpowiedź</button>
</form>`));
    return;
  }

  const proposedDates = String(dates || "").trim().slice(0, 1000);
  if (action === "propose" && !proposedDates) {
    res.status(200).send(page("Zaproponuj inny termin", `<p>${details}</p>
<form method="GET" action="/api/confirm">${hidden}
  <textarea name="dates" required placeholder="np. 12.09 po 16:00, 14.09 cały dzień"></textarea>
  <button type="submit">Wyślij propozycję</button>
</form>`));
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sends = [];

    if (action === "confirm") {
      // Artysta — termin pasuje obu stronom, logistykę ustala z restauracją.
      if (artistEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: artistEmail,
          subject: `Restauracja potwierdziła termin — ${workshopName || ""}, ${date || ""}`,
          html: emailHtml(`
            <p>Cześć ${artistName || ""}!</p>
            ${kidsEventBlock}
            <p>Restauracja <strong>${restaurantName || ""}</strong> potwierdziła termin <strong>${date || ""}</strong> — data jest ustalona i pasuje restauracji. Możesz ją śmiało zablokować w kalendarzu.</p>
            <p>Jeśli potrzebujesz innych informacji logistycznych (np. godzina wejścia, ustawienie sali, dojazd, parking), skontaktuj się bezpośrednio z restauracją: ${restaurantContact}</p>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      if (clientEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: clientEmail,
          // "Termin zarezerwowany", nie "rezerwacja potwierdzona" — wg regulaminu
          // do umowy dochodzi dopiero po ustaleniu menu i ceny z restauracją.
          subject: "Termin zarezerwowany!",
          html: emailHtml(`
            <p>Cześć ${clientName || ""}!</p>
            ${kidsEventBlock}
            <p>Termin jest zarezerwowany — potwierdził go artysta i restauracja:</p>
            <ul>
              <li>Warsztat: ${workshopName || "-"}</li>
              <li>Miejsce: ${restaurantName || "-"}</li>
              <li>Termin: ${date || "do ustalenia"}</li>
              <li>Liczba osób: ${groupSize || "-"}</li>
            </ul>
            <p>Pozostałe szczegóły — takie jak menu, ostateczna cena i zadatek (30%) — ustalicie z restauracją w dalszej kolejności. <strong>Restauracja ${restaurantName || ""} odezwie się do Ciebie w ciągu 48 godzin.</strong></p>
            <p>Jeśli w tym czasie nikt się nie odezwie albo chcesz coś zmienić lub odwołać, napisz do nas na <a href="mailto:${OWNER_EMAIL}" style="color:#432A16;">${OWNER_EMAIL}</a> — zajmiemy się tym.</p>
            <p>Do zobaczenia na evencie!</p>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      // Restauracja — pisemne przypomnienie następnego kroku (kontakt w 48 h).
      if (restaurantEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: restaurantEmail,
          subject: `Termin zarezerwowany — prosimy o kontakt z klientem w ciągu 48 h`,
          html: emailHtml(`
            <p>Cześć!</p>
            ${kidsEventBlock}
            <p>Dziękujemy za potwierdzenie terminu <strong>${date || ""}</strong> (${workshopName || "warsztat"}, ${groupSize || "-"} os.). Klient i artysta już o tym wiedzą.</p>
            <p><strong>Następny krok: w ciągu 48 godzin odezwijcie się proszę do klienta</strong> w sprawie menu i ostatecznej ceny oraz poinformujcie go o zadatku (30%, zgodnie z regulaminem):<br>${clientContact}</p>
            <p>Jeśli artysta będzie potrzebował informacji logistycznych, odezwie się do Was bezpośrednio: ${artistContact}</p>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      sends.push(sendEmail(resend,{
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `Restauracja potwierdziła termin: ${restaurantName || ""} + ${workshopName || ""}`,
        html: emailHtml(`<p>Restauracja zarezerwowała termin dla ${clientName || ""} (${restaurantName || ""}, ${date || ""}, ${groupSize || "-"} os.). Teraz ma 48 h na kontakt z klientem w sprawie menu i ceny.</p>${kidsEventBlock}`),
      }));
    } else if (action === "propose") {
      const datesHtml = nl2br(proposedDates);

      if (clientEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: clientEmail,
          subject: `Restauracja proponuje inny termin — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć ${clientName || ""},</p>
            ${kidsEventBlock}
            <p>Restauracji <strong>${restaurantName || ""}</strong> nie pasuje termin ${date || ""}. Proponuje inne terminy:</p>
            <p><strong>${datesHtml}</strong></p>
            <p>Artysta potwierdził na razie tylko pierwotny termin, więc nowy musi pasować także jemu. Prosimy ustalić szczegóły bezpośrednio z restauracją i artystą:</p>
            <ul>
              <li>Restauracja: ${restaurantContact}</li>
              <li>Artysta: ${artistContact}</li>
            </ul>
            ${NEW_DATE_INFO}
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      if (artistEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: artistEmail,
          subject: `Restauracja proponuje inny termin — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć ${artistName || ""}!</p>
            ${kidsEventBlock}
            <p>Restauracji <strong>${restaurantName || ""}</strong> nie pasuje termin ${date || ""}, więc nie jest on już aktualny — możesz go zwolnić w kalendarzu. Restauracja proponuje:</p>
            <p><strong>${datesHtml}</strong></p>
            <p>Jeśli któryś termin Ci pasuje, ustalcie szczegóły bezpośrednio:</p>
            <ul>
              <li>Klient: ${clientContact}</li>
              <li>Restauracja: ${restaurantContact}</li>
            </ul>
            ${NEW_DATE_INFO}
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      if (restaurantEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: restaurantEmail,
          subject: `Propozycja terminów przekazana — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć!</p>
            ${kidsEventBlock}
            <p>Przekazaliśmy Waszą propozycję terminów klientowi i artyście:</p>
            <p><strong>${datesHtml}</strong></p>
            <p>Dalsze ustalenia są teraz bezpośrednio między Wami:</p>
            <ul>
              <li>Klient: ${clientContact}</li>
              <li>Artysta: ${artistContact}</li>
            </ul>
            ${NEW_DATE_INFO}
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      sends.push(sendEmail(resend,{
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `Restauracja proponuje inny termin: ${restaurantName || ""} + ${workshopName || ""}`,
        html: emailHtml(`<p>Restauracja ${restaurantName || ""} zaproponowała inne terminy dla zapytania od ${clientName || ""} (${workshopName || ""}, pierwotny termin: ${date || "-"}).</p><p>Zaproponowane terminy:<br>${datesHtml}</p>${kidsEventBlock}`),
      }));
    } else {
      const noteText = String(note || "").trim().slice(0, 1000);
      const noteHtml = noteText ? nl2br(noteText) : "";
      const reasonClient = DECLINE_REASONS[reasonKey].client;
      const reasonBlock = [reasonClient, noteHtml ? `Informacja od restauracji: „${noteHtml}”` : ""].filter(Boolean).map(s => `<p>${s}</p>`).join("");

      if (clientEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: clientEmail,
          subject: `Restauracja nie może przyjąć rezerwacji — ${restaurantName || ""}`,
          html: emailHtml(`
            <p>Cześć ${clientName || ""},</p>
            ${kidsEventBlock}
            <p>Bardzo nam przykro — restauracja <strong>${restaurantName || ""}</strong> nie może przyjąć rezerwacji w terminie ${date || ""}.</p>
            ${reasonBlock}
            <p>Artysta (${workshopName || "wybrany warsztat"}) miał ten termin wolny, więc możesz wybrać inną restaurację na ten sam dzień albo inny termin — wystarczy wysłać nowe zapytanie na stronie ${newInquiryLink}.</p>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      if (artistEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: artistEmail,
          subject: `To zapytanie nie dojdzie do skutku — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć ${artistName || ""}!</p>
            ${kidsEventBlock}
            <p>Restauracja <strong>${restaurantName || ""}</strong> nie może przyjąć rezerwacji w terminie ${date || "-"}, więc to zapytanie nie dojdzie do skutku. Możesz spokojnie zwolnić ten termin w kalendarzu. Jeśli klient wybierze inną restaurację, dostaniesz od nas nowe zapytanie.</p>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      sends.push(sendEmail(resend,{
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `Restauracja odrzuciła: ${restaurantName || ""} + ${workshopName || ""}`,
        html: emailHtml(`<p>Restauracja <strong>${restaurantName || ""}</strong> odrzuciła zapytanie od ${clientName || ""}${clientEmail ? ` (${clientEmail}${clientPhone ? ", " + clientPhone : ""})` : ""} — warsztat ${workshopName || "-"}, termin ${date || "-"}.</p><p>Powód: ${DECLINE_REASONS[reasonKey].label}${noteHtml ? `<br>Dopisek: ${noteHtml}` : ""}</p><p>Klient dostał maila z prośbą o wybranie innej restauracji lub terminu, artysta — informację, że może zwolnić termin.</p>${kidsEventBlock}`),
      }));
    }

    await Promise.all(sends);

    res.status(200).send(
      action === "confirm"
        ? htmlPage("Dziękujemy!", `Termin zarezerwowany. Klient i artysta zostali poinformowani mailowo. Prosimy o kontakt z klientem w ciągu 48 godzin w sprawie menu i ceny: ${clientContact}`)
        : action === "propose"
        ? htmlPage("Wysłano!", "Przekazaliśmy Waszą propozycję terminów klientowi i artyście. Dalsze ustalenia są teraz bezpośrednio między Wami.")
        : htmlPage("Dziękujemy za odpowiedź", "Przekazaliśmy klientowi uprzejmą informację, a artysta wie, że może zwolnić termin.")
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(htmlPage("Błąd", `Coś poszło nie tak przy wysyłce. Spróbuj ponownie za chwilę lub napisz do nas na ${OWNER_EMAIL}.`));
  }
}

// Błąd spoza bloków try (np. brak INQUIRY_SIGNING_SECRET w ustawieniach
// Vercela) — zamiast surowego "FUNCTION_INVOCATION_FAILED" czytelna strona;
// na wersjach podglądowych z dokładną przyczyną, żeby łatwiej ją znaleźć.
export default async function handler(req, res) {
  try {
    await obsluz(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send(htmlPage("Błąd", IS_PRODUCTION ? "Coś poszło nie tak. Spróbuj ponownie za chwilę lub napisz do Joanny." : `Błąd (wersja testowa): ${escapeHtml(err && err.message)}`));
  }
}
