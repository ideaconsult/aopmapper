import { useState } from 'react';
import { generatePythonCode } from '../utils/solr.js';

export default function DebugPanel({ solrParams }) {
  const [copied, setCopied] = useState(false);
  const code = solrParams
    ? generatePythonCode(solrParams.toString())
    : '# Run a search first to see the generated Python query here.';

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h5 mb-0">Debug Info</h2>
        <button className="btn btn-sm btn-outline-secondary" onClick={copy}>
          <i className="fa-regular fa-copy me-1" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-muted small mb-2">
        Equivalent Python code for the last executed query:
      </p>
      <pre className="debug-pre">{code}</pre>
    </div>
  );
}
