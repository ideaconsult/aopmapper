import { useState, useEffect, useCallback } from 'react';
import { buildSolrParams, fetchSolrPage } from '../utils/solr.js';
import { aopWikiUrl, typeBadgeClass, TYPE_LABELS } from '../utils/aopLinks.js';

const PAGE_SIZES = [10, 25, 50];

const COLUMNS = [
  { key: 'id',            title: 'ID' },
  { key: 'title_t',       title: 'Name' },
  { key: 'type_s',        title: 'Type' },
  { key: 'source_t',      title: 'Source' },
  { key: 'upstream_ss',   title: 'Upstream' },
  { key: 'downstream_ss', title: 'Downstream' },
  { key: 'doi_ss',        title: 'References' },
  { key: 'biological_object_ids_ss',  title: 'Bio object' },
  { key: 'biological_process_ids_ss', title: 'Bio process' },
  { key: 'biological_action_ids_ss',  title: 'Bio action' },
  { key: 'score',         title: 'Score' },
];

function IdCell({ id, onSetId }) {
  const url = aopWikiUrl(id);
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {url
        ? <a href={url} target="_blank" rel="noreferrer">{id}</a>
        : id}
      {' '}
      <a
        href="#"
        title={`Set ID to '${id}'`}
        onClick={e => { e.preventDefault(); onSetId(id); }}
        style={{ color: '#888', fontSize: '0.85em' }}
      >
        <i className="fa fa-copy" />
      </a>
    </span>
  );
}

function AopElementsCell({ data }) {
  if (!Array.isArray(data)) return null;
  return (
    <span>
      {data.map((id, i) => {
        const url = aopWikiUrl(id);
        return (
          <span key={i}>
            {i > 0 && ', '}
            {url ? <a href={url} target="_blank" rel="noreferrer">{id}</a> : id}
          </span>
        );
      })}
    </span>
  );
}

function DoiCell({ data }) {
  if (!Array.isArray(data)) return null;
  return (
    <span>
      {data.map((doi, i) => (
        <span key={i}>
          {i > 0 && ', '}
          <a href={`https://doi.org/${doi}`} target="_blank" rel="noreferrer">{doi}</a>
        </span>
      ))}
    </span>
  );
}

function TypeBadge({ type }) {
  const cls = typeBadgeClass(type);
  const label = TYPE_LABELS[type] || type;
  return <span className={`type-badge ${cls}`}>{label}</span>;
}

function renderCell(col, row, onSetId) {
  const val = row[col.key];
  switch (col.key) {
    case 'id':
      return <IdCell id={val} onSetId={onSetId} />;
    case 'title_t':
      return val || row.short_name_t || row.name_t || row.preferred_name_t || '';
    case 'type_s':
      return val ? <TypeBadge type={val} /> : '';
    case 'upstream_ss':
    case 'downstream_ss':
      return <AopElementsCell data={val} />;
    case 'doi_ss':
      return <DoiCell data={val} />;
    case 'biological_object_ids_ss':
    case 'biological_process_ids_ss':
    case 'biological_action_ids_ss':
      return Array.isArray(val) ? val.join(', ') : (val || '');
    case 'score':
      return typeof val === 'number' ? val.toFixed(3) : (val || '');
    default:
      return val || '';
  }
}

export default function ResultsTable({ searchState, onSetFieldId, onParamsReady }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('title_t');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [solrParams, setSolrParams] = useState(null);

  // Rebuild params whenever searchState changes (triggered by onSubmit)
  useEffect(() => {
    if (!searchState.submitted) return;
    setPage(0);
    buildSolrParams(searchState).then(p => {
      setSolrParams(p);
      if (onParamsReady) onParamsReady(p);
    });
  }, [searchState.submitted, searchState]);

  const load = useCallback(async () => {
    if (!solrParams) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSolrPage(solrParams, page * pageSize, pageSize, sortField, sortDir);
      setRows(data.response.docs || []);
      setTotal(data.response.numFound || 0);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [solrParams, page, pageSize, sortField, sortDir]);

  useEffect(() => { load(); }, [load]);

  function handleSort(key) {
    if (sortField === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortDir('asc');
    }
    setPage(0);
  }

  const totalPages = Math.ceil(total / pageSize);

  if (!searchState.submitted) {
    return (
      <div className="text-center text-muted py-5">
        <i className="fa fa-search fa-2x mb-2 d-block" />
        Enter search criteria above and click <strong>AOP Wiki Search</strong>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="text-muted small">
          {loading ? 'Loading…' : `${total.toLocaleString()} result${total !== 1 ? 's' : ''}`}
        </span>
        <div className="d-flex align-items-center gap-2">
          <label className="small me-1 mb-0">Page size:</label>
          <select
            className="form-select form-select-sm"
            style={{ width: '80px' }}
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="aop-table-wrap">
        <table className="aop-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)}>
                  {col.title}
                  {sortField === col.key
                    ? <i className={`fa fa-sort-${sortDir === 'asc' ? 'up' : 'down'} ms-1`} />
                    : <i className="fa fa-sort ms-1 text-muted" style={{ fontSize: '0.7em' }} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />
                    Loading…
                  </td>
                </tr>
              )
              : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="text-center text-muted py-4">
                      No results found.
                    </td>
                  </tr>
                )
                : rows.map((row, i) => (
                  <tr key={row.id || i}>
                    {COLUMNS.map(col => (
                      <td key={col.key}>
                        {renderCell(col, row, onSetFieldId)}
                      </td>
                    ))}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-2">
          <ul className="pagination pagination-sm aop-pagination mb-0 flex-wrap">
            <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(0)}>«</button>
            </li>
            <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(p => p - 1)}>‹</button>
            </li>
            {[...Array(Math.min(totalPages, 10))].map((_, i) => {
              const p = Math.max(0, Math.min(totalPages - 10, page - 4)) + i;
              return (
                <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p)}>{p + 1}</button>
                </li>
              );
            })}
            <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(p => p + 1)}>›</button>
            </li>
            <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(totalPages - 1)}>»</button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
