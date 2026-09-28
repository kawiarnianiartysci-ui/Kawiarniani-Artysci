// ══════════════════════════════════════════════════════════════
// 🗺️  SITEMAP — /sitemap.xml generowana automatycznie z arkusza
// ══════════════════════════════════════════════════════════════
// Lista wszystkich stron, które chcemy mieć w Google: strona główna,
// podstrony okazji i profile wszystkich AKTYWNYCH warsztatów i miejsc
// (comingSoon = TRUE, czyli szkice, są pomijane). Nowy artysta dodany w
// arkuszu pojawia się tu sam, bez zmian w kodzie (w ciągu ok. godziny).
import { getSheetData } from "./_sheet.js";
import { SITE_URL, OCCASIONS, occasionPath, profilePath } from "../src/seo.js";

export default async function handler(req, res) {
  const paths = ["/", ...OCCASIONS.map(occasionPath)];
  try {
    const { restaurants, workshops } = await getSheetData();
    const seen = new Set();
    const add = p => { if (!seen.has(p)) { seen.add(p); paths.push(p); } };
    workshops.filter(w => !w.comingSoon && w.slug).forEach(w => add(profilePath("workshop", w)));
    restaurants.filter(r => !r.comingSoon && r.slug).forEach(r => add(profilePath("restaurant", r)));
  } catch (err) {
    // Arkusz nie odpowiada — oddajemy chociaż stronę główną i okazje,
    // i nie zapamiętujemy tej niepełnej wersji na długo.
    console.error("Arkusz:", err);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(p => `  <url><loc>${SITE_URL}${p}</loc></url>`).join("\n")}
</urlset>
`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  if (!res.getHeader("Cache-Control")) res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}
