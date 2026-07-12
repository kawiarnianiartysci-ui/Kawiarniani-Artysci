import { Resend } from "resend";
import { FROM_EMAIL, OWNER_EMAIL, SITE_URL, signPayload, emailHtml } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const {
      clientName, clientEmail, clientPhone,
      restaurantName, restaurantEmail,
      artistName, workshopName, artistEmail,
      artistInvoicing, artistRequirements,
      groupSize, date, message,
    } = req.body || {};

    if (!clientName || !clientEmail) {
      res.status(400).json({ error: "Brak imienia lub adresu email klienta." });
      return;
    }

    const payload = {
      clientName, clientEmail, clientPhone: clientPhone || "",
      restaurantName: restaurantName || "", restaurantEmail: restaurantEmail || "",
      artistName: artistName || "", workshopName: workshopName || "", artistEmail: artistEmail || "",
      artistInvoicing: artistInvoicing || "", artistRequirements: artistRequirements || "",
      groupSize: groupSize || "", date: date || "", message: message || "",
      ts: Date.now(),
    };
    const { data, sig } = signPayload(payload);
    const acceptUrl = `${SITE_URL}/api/respond?action=accept&data=${data}&sig=${sig}`;
    const declineUrl = `${SITE_URL}/api/respond?action=decline&data=${data}&sig=${sig}`;

    const sends = [];

    if (artistEmail) {
      sends.push(resend.emails.send({
        from: FROM_EMAIL,
        to: artistEmail,
        subject: `Nowe zapytanie: ${restaurantName || "restauracja"} — ${workshopName || "warsztat"}`,
        html: emailHtml(`
          <p>Cześć ${artistName || ""}!</p>
          <p>Restauracja <strong>${restaurantName || ""}</strong> dostała zapytanie o Twój warsztat „${workshopName || ""}". Oto szczegóły:</p>
          <ul>
            <li>Termin: ${date || "do ustalenia"}</li>
            <li>Liczba osób: ${groupSize || "-"}</li>
            ${message ? `<li>Wiadomość od klienta: ${message}</li>` : ""}
          </ul>
          <p>Daj nam znać, czy ten termin Ci pasuje:</p>
          <p>
            <a href="${acceptUrl}" style="background:#432A16;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;margin-right:10px;display:inline-block;">Mogę — akceptuję</a>
            <a href="${declineUrl}" style="background:#999;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Niestety nie mogę</a>
          </p>
          <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
        `),
      }));
    }

    if (restaurantEmail) {
      sends.push(resend.emails.send({
        from: FROM_EMAIL,
        to: restaurantEmail,
        subject: "Nowe zapytanie o event — czekamy na potwierdzenie artysty",
        html: emailHtml(`
          <p>Cześć!</p>
          <p>Macie nowe zapytanie o wspólny event:</p>
          <ul>
            <li>Warsztat: ${workshopName || "-"} ${artistName ? `(${artistName})` : ""}</li>
            <li>Termin: ${date || "do ustalenia"}</li>
            <li>Liczba osób: ${groupSize || "-"}</li>
            <li>Klient: ${clientName}</li>
          </ul>
          <p>Czekamy teraz na potwierdzenie terminu przez artystę — damy znać mailowo, jak tylko odpowie.</p>
          <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
        `),
      }));
    }

    sends.push(resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `Nowe zapytanie: ${restaurantName || "-"} + ${workshopName || "-"}`,
      html: emailHtml(`
        <p>Nowe zapytanie na stronie:</p>
        <ul>
          <li>Klient: ${clientName} (${clientEmail}${clientPhone ? ", " + clientPhone : ""})</li>
          <li>Restauracja: ${restaurantName || "-"} ${restaurantEmail ? `(${restaurantEmail})` : "(brak adresu email w arkuszu)"}</li>
          <li>Warsztat: ${workshopName || "-"} ${artistName ? `(${artistName})` : ""} ${artistEmail ? `(${artistEmail})` : "(brak adresu email w arkuszu)"}</li>
          <li>Termin: ${date || "do ustalenia"}</li>
          <li>Liczba osób: ${groupSize || "-"}</li>
          ${message ? `<li>Wiadomość: ${message}</li>` : ""}
        </ul>
      `),
    }));

    await Promise.all(sends);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Nie udało się wysłać zapytania." });
  }
}
