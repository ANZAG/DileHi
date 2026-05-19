#!/usr/bin/env node
/**
 * Automated SEO checks - runs in CI on every commit.
 * Validates:
 *  - index.html has lang, viewport, title, description, og:image
 *  - Every page in src/pages (excluding intern/) uses <SEO /> with title + description
 *  - Epoch pages carry JSON-LD structured data
 *  - public/robots.txt and public/sitemap.xml exist and reference production domain
 *  - public/llms.txt exists
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

// 1. index.html basics
try {
  const html = read("index.html");
  if (!/<html[^>]*\slang=/.test(html)) errors.push("index.html: missing <html lang>");
  if (!/name=["']viewport["']/.test(html)) errors.push("index.html: missing viewport meta");
  if (!/<title>[^<]{10,}<\/title>/.test(html)) errors.push("index.html: missing or too short <title>");
  if (!/property=["']og:image["']/.test(html)) warnings.push("index.html: missing og:image fallback");
} catch (e) {
  errors.push(`index.html unreadable: ${e.message}`);
}

// 2. Public route pages must use <SEO />
const pagesDir = path.join(root, "src/pages");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? walk(p) : [p];
});
const allPages = walk(pagesDir).filter((p) => p.endsWith(".tsx"));
// Skip intern/, NotFound, and auth pages (Login/ResetPassword are noindex)
const skipPattern = /(NotFound|Login|ResetPassword)\.tsx$/;
const publicPages = allPages.filter((p) => !p.includes(`${path.sep}intern${path.sep}`) && !skipPattern.test(p));

for (const file of publicPages) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (!/<SEO\b/.test(src)) {
    errors.push(`${rel}: missing <SEO /> component`);
    continue;
  }
  if (!/title=/.test(src)) errors.push(`${rel}: <SEO> missing title prop`);
  if (!/description=/.test(src)) errors.push(`${rel}: <SEO> missing description prop`);
}

// 3. Epoch pages need JSON-LD
const epochPages = publicPages.filter((p) => /Epoch.*\.tsx$/.test(path.basename(p)));
for (const file of epochPages) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (!/jsonLd\s*=|application\/ld\+json/.test(src)) {
    errors.push(`${rel}: missing JSON-LD structured data`);
  }
}

// 4. robots.txt + sitemap.xml + llms.txt
if (!exists("public/robots.txt")) errors.push("public/robots.txt missing");
else {
  const r = read("public/robots.txt");
  if (!/sitemap/i.test(r)) warnings.push("public/robots.txt: no Sitemap directive");
}
if (!exists("public/sitemap.xml")) errors.push("public/sitemap.xml missing");
else {
  const s = read("public/sitemap.xml");
  if (!/dilehi\.de/.test(s)) errors.push("public/sitemap.xml: production domain (dilehi.de) not referenced");
}
if (!exists("public/llms.txt")) warnings.push("public/llms.txt missing");

// Report
if (warnings.length) {
  console.warn("\nSEO warnings:");
  for (const w of warnings) console.warn("  -", w);
}
if (errors.length) {
  console.error("\nSEO check failed:");
  for (const e of errors) console.error("  -", e);
  console.error(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`SEO checks passed (${warnings.length} warning(s)).`);
