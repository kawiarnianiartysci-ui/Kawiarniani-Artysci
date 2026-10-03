// ══════════════════════════════════════════════════════════════
// 🖼️  Zdjęcia wpisów: /blog-img/<adres>/<nr>-<szerokość>[-<odcisk>].<webp|jpg>
// ══════════════════════════════════════════════════════════════
// Zdjęcia wklejone do Dokumentu Google przychodzą w eksporcie jako base64
// (często pełne zdjęcia z telefonu, kilka MB). Tu je zmniejszamy (sharp) do
// szerokości strony — Joanna nie musi niczego zmniejszać.
// Adres z "odciskiem" (imgHash w api/_blogDoc.js) wskazuje jedną konkretną
// wersję zdjęcia, więc przeglądarki i Vercel trzymają go w pamięci na stałe;
// podmiana zdjęcia w dokumencie daje nowy odcisk = nowy adres, widoczny od
// razu. Adres bez odcisku (okładka na liście wpisów) — pamięć na dobę.
import sharp from "sharp";
import { getBlogIndex, getPost } from "./_blog.js";
import { imgHash } from "./_blogDoc.js";

const WIDTHS = [640, 1080, 1200];

export default async function handler(req, res) {
  const slug = String(req.query.adres || "");
  const m = String(req.query.file || "").match(/^(\d+)-(\d+)(?:-([a-z0-9]+))?\.(webp|jpg)$/);
  const notFound = () => {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
    res.status(404).send("Nie ma takiego zdjęcia");
  };
  if (!m || !WIDTHS.includes(Number(m[2]))) return notFound();
  try {
    const row = (await getBlogIndex()).find(r => r.slug === slug);
    const r = row ? await getPost(row) : null;
    const img = r && r.post ? r.post.images[Number(m[1])] : null;
    if (!img) return notFound();
    const input = img.data
      ? Buffer.from(img.data, "base64")
      : Buffer.from(await (await fetch(img.url)).arrayBuffer());
    const pipeline = sharp(input).rotate().resize({ width: Number(m[2]), withoutEnlargement: true });
    const jpg = m[4] === "jpg";
    const out = jpg ? await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer() : await pipeline.webp({ quality: 75 }).toBuffer();
    // Odcisk zgodny z aktualnym zdjęciem → na stałe; stary odcisk (zdjęcie
    // już podmienione) → krótko; brak odcisku → doba.
    const cache = !m[3] ? "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
      : m[3] === imgHash(img) ? "public, max-age=31536000, immutable"
      : "public, max-age=0, s-maxage=300";
    res.setHeader("Content-Type", jpg ? "image/jpeg" : "image/webp");
    res.setHeader("Cache-Control", cache);
    res.status(200).send(out);
  } catch (err) {
    console.error("Blog (zdjęcie):", err);
    res.setHeader("Cache-Control", "no-store");
    res.status(503).send("Zdjęcie chwilowo niedostępne");
  }
}
