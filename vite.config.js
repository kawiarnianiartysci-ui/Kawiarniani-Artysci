import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// Po zbudowaniu strony zapisuje gotowy index.html (z właściwymi nazwami
// plików JS/CSS) jako moduł api/_szablon.js. Funkcja api/page.js używa go jako
// szablonu: wstawia do niego tytuł, opis, zdjęcie i treść konkretnego profilu
// czy okazji, zanim odda stronę Google'owi/Facebookowi. Plik powstaje przy
// każdym buildzie na Vercelu — nie trzymamy go w repozytorium (.gitignore).
function szablonDlaSerwera() {
  let config;
  return {
    name: "szablon-dla-serwera",
    apply: "build",
    configResolved(c) { config = c; },
    closeBundle() {
      const html = fs.readFileSync(path.resolve(config.root, config.build.outDir, "index.html"), "utf-8");
      const out = `// Plik generowany automatycznie przez vite.config.js — nie edytuj.\nexport default ${JSON.stringify(html)};\n`;
      fs.writeFileSync(path.resolve(config.root, "api/_szablon.js"), out);
    },
  };
}

export default defineConfig({
  plugins: [react(), szablonDlaSerwera()],
});
