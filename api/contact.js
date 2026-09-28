import { Resend } from 'resend';
import { FROM_EMAIL, OWNER_EMAIL, emailHtml, escapeHtml, nl2br, sendEmail } from './_shared.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, message } = req.body || {};

  // Validation
  if (!email || !String(email).trim()) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Treść wpisana przez odwiedzającego — escapeHtml/nl2br, żeby nie dało
  // się wstrzyknąć do maila własnych znaczników (np. fałszywego linku).
  const ok = await sendEmail(resend, {
    from: FROM_EMAIL,
    to: OWNER_EMAIL,
    subject: 'Nowa wiadomość ze strony — kontakt',
    html: emailHtml(`
      <p><strong>Nowa wiadomość ze strony kawiarnianiartysci.pl</strong></p>
      <p><strong>Od:</strong> ${escapeHtml(String(email).slice(0, 200))}</p>
      <p><strong>Wiadomość:</strong></p>
      <p>${nl2br(String(message).slice(0, 5000))}</p>
      <hr>
      <p><em>Odpowiedź wysyłaj bezpośrednio na ten adres email.</em></p>
    `),
  });

  if (!ok) {
    return res.status(500).json({ success: false, error: 'Failed to send email' });
  }
  return res.status(200).json({ success: true, message: 'Message received' });
}
