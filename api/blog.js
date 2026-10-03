// Lista opublikowanych wpisów (JSON) — dla podstron okazji otwieranych
// wewnątrz aplikacji ("Przeczytaj na blogu"). Patrz api/_blog.js.
import { listPosts } from "./_blog.js";

export default async function handler(req, res) {
  try {
    const posts = await listPosts();
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
    res.status(200).json(posts);
  } catch (err) {
    console.error("Blog:", err);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
    res.status(200).json([]);
  }
}
