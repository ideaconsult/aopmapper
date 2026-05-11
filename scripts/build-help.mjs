/**
 * scripts/build-help.mjs
 *
 * Converts guide.md and mcp.md → public/help.html and public/mcp.html.
 * Run automatically via "prebuild" and at the start of "dev".
 */

import { readFileSync, writeFileSync } from 'fs';
import { marked } from 'marked';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

marked.setOptions({ gfm: true, breaks: false });

// Inline the SVG logo so it works without base-path dependency
const logo = readFileSync(resolve(root, 'public', 'assets', 'img', 'logo-aopmapper.svg'), 'utf8');

// ── shared styles ─────────────────────────────────────────────────────────────

const SHARED_STYLES = `
  :root {
    --aop-primary:        #6366f1;
    --aop-primary-border: #818cf8;
    --aop-primary-hover:  #4f46e5;
  }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #f8f9fa;
    color: #212529;
  }
  .aop-header {
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    padding: 0.5rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .aop-header svg { height: 40px; width: auto; }
  .aop-header h1 { font-size: 1.2rem; margin: 0; color: var(--aop-primary); }
  .aop-header .back-link {
    margin-left: auto;
    font-size: 0.85rem;
    color: var(--aop-primary);
    text-decoration: none;
    white-space: nowrap;
  }
  .aop-header .back-link:hover { color: var(--aop-primary-hover); }
  .aop-header .nav-links { margin-left: auto; display: flex; gap: 1.5rem; }
  .aop-header .nav-links a {
    font-size: 0.85rem;
    color: var(--aop-primary);
    text-decoration: none;
    white-space: nowrap;
  }
  .aop-header .nav-links a:hover { color: var(--aop-primary-hover); }
  .help-card {
    background: #fff;
    border-radius: 0.5rem;
    box-shadow: 0 1px 4px rgba(0,0,0,.08);
    padding: 2rem 2.5rem;
    margin: 2rem auto 4rem;
    max-width: 860px;
  }
  h1 { color: var(--aop-primary); margin-bottom: 0.25rem; font-size: 1.75rem; }
  h1 + p { color: #6b7280; font-size: 0.95rem; margin-bottom: 1.75rem; }
  h2 {
    margin-top: 2.5rem;
    padding-bottom: 0.4rem;
    border-bottom: 2px solid #ede9fe;
    color: var(--aop-primary-hover);
    font-size: 1.2rem;
  }
  h3 { margin-top: 1.75rem; font-size: 1rem; color: #374151; }
  table { width: 100%; margin-bottom: 1.25rem; font-size: 0.875rem; border-collapse: collapse; }
  thead th {
    background: #f3f4f6;
    border-bottom: 2px solid #dee2e6;
    padding: 0.5rem 0.75rem;
    font-weight: 600;
    color: #374151;
  }
  tbody td { padding: 0.45rem 0.75rem; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tbody tr:hover td { background: #f9f9ff; }
  code {
    background: #ede9fe;
    color: var(--aop-primary-hover);
    padding: .1em .4em;
    border-radius: 3px;
    font-size: .875em;
  }
  pre {
    background: #f3f4f6;
    padding: 1rem 1.25rem;
    border-radius: 6px;
    overflow-x: auto;
    border-left: 3px solid var(--aop-primary);
  }
  pre code { background: none; padding: 0; color: inherit; font-size: .85em; }
  a { color: var(--aop-primary); }
  a:hover { color: var(--aop-primary-hover); }
  blockquote {
    border-left: 3px solid var(--aop-primary-border);
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    background: #f9f9ff;
    color: #374151;
    font-style: italic;
  }
  blockquote p { margin: 0.25rem 0; }
  .aop-footer {
    background: #f8f9fa;
    border-top: 1px solid #dee2e6;
    padding: 0.75rem 1.5rem;
    font-size: 0.8rem;
    color: #6b7280;
  }
  .aop-footer a { color: #6b7280; }
  .aop-footer a:hover { color: var(--aop-primary); }
`;

// ── page template ─────────────────────────────────────────────────────────────

function buildPage({ title, body, navLinks, footerExtra = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  <style>${SHARED_STYLES}</style>
</head>
<body>

  <header class="aop-header">
    <a href="./" aria-label="AOP Mapper home">${logo}</a>
    <h1>AOP Mapper</h1>
    <nav class="nav-links">
      ${navLinks}
    </nav>
  </header>

  <div class="container-fluid px-3">
    <div class="help-card">
      ${body}
    </div>
  </div>

  <footer class="aop-footer">
    <div class="d-flex flex-wrap justify-content-between gap-2">
      <span>
        Funded by the European Union's H2020 under
        <a href="https://www.harmless-project.eu/" target="_blank" rel="noreferrer">953183 HARMLESS</a>
        and
        <a href="https://polyrisk.science/" target="_blank" rel="noreferrer">964766 POLYRISK</a>
        and Horizon Europe
        <a href="https://phantastic-project.eu/" target="_blank" rel="noreferrer">101130073 PHANTASTIC</a>
        ${footerExtra}
      </span>
      <a href="mailto:support@ideaconsult.net">support@ideaconsult.net</a>
    </div>
  </footer>

</body>
</html>`;
}

// ── compile one markdown file ─────────────────────────────────────────────────

function compile({ src, dest, title, navLinks, footerExtra = '' }) {
  const raw      = readFileSync(resolve(root, src), 'utf8');
  const stripped = raw.replace(/^---[\s\S]*?---\s*\n/, '');
  const body     = marked(stripped);
  const html     = buildPage({ title, body, navLinks, footerExtra });
  writeFileSync(resolve(root, 'public', dest), html, 'utf8');
  console.log(`✓ public/${dest} generated from ${src}`);
}

// ── build all pages ───────────────────────────────────────────────────────────

compile({
  src:   'guide.md',
  dest:  'help.html',
  title: 'AOP Mapper – User Guide',
  navLinks: `
    <a href="./">← Back to AOP Mapper</a>
    <a href="./mcp.html"><i class="fa fa-robot me-1"></i>MCP / AI Assistants</a>
  `,
});

compile({
  src:   'mcp.md',
  dest:  'mcp.html',
  title: 'AOP Mapper – MCP / AI Assistants',
  navLinks: `
    <a href="./">← Back to AOP Mapper</a>
    <a href="./help.html"><i class="fa fa-book me-1"></i>User Guide</a>
  `,
  footerExtra: ' · MCP endpoint: <code>https://mcp.aop.adma.ai/mcp</code>',
});
