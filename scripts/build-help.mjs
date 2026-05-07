/**
 * scripts/build-help.mjs
 *
 * Converts guide.md → public/help.html.
 * Run automatically via "prebuild" and at the start of "dev".
 * Uses the same Bootstrap + Font Awesome CDN links as index.html.
 */

import { readFileSync, writeFileSync } from 'fs';
import { marked } from 'marked';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Read guide.md and strip YAML frontmatter (--- ... ---)
const raw = readFileSync(resolve(root, 'guide.md'), 'utf8');
const stripped = raw.replace(/^---[\s\S]*?---\s*\n/, '');

// Configure marked: GitHub-flavoured markdown, smart typography
marked.setOptions({ gfm: true, breaks: false });

const body = marked(stripped);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AOP Mapper – User Guide</title>
  <meta name="description" content="User guide for AOP Mapper" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  <style>
    body { padding: 2rem 0 4rem; color: #212529; }
    h1 { margin-bottom: 1.5rem; }
    h2 { margin-top: 2.5rem; border-bottom: 1px solid #dee2e6; padding-bottom: .4rem; }
    h3 { margin-top: 1.8rem; }
    table { width: 100%; margin-bottom: 1.25rem; font-size: .9rem; }
    th { background: #f8f9fa; }
    code { background: #f1f3f5; padding: .1em .35em; border-radius: 3px; font-size: .88em; }
    pre code { background: none; padding: 0; font-size: .85em; }
    pre { background: #f1f3f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    .back-link { font-size: .9rem; }
  </style>
</head>
<body>
  <div class="container" style="max-width:860px">
    <p class="back-link mb-4">
      <a href="./"><i class="fa fa-arrow-left me-1"></i>Back to AOP Mapper</a>
    </p>
    ${body}
    <hr class="mt-5" />
    <p class="text-muted small">
      AOP Mapper is funded by the European Union's Horizon 2020 under
      <a href="https://www.harmless-project.eu/" target="_blank" rel="noreferrer">953183 HARMLESS</a>
      and
      <a href="https://polyrisk.science/" target="_blank" rel="noreferrer">964766 POLYRISK</a>.
    </p>
  </div>
</body>
</html>
`;

const out = resolve(root, 'public', 'help.html');
writeFileSync(out, html, 'utf8');
console.log(`✓ public/help.html generated from guide.md`);
