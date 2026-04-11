import { useState, useEffect, useCallback } from 'react';
import { aopWikiUrl, typeBadgeClass, TYPE_LABELS } from '../utils/aopLinks.js';

const PAGE_SIZES = [10, 25, 50];

const ALL_COLUMNS = [
  { key: 'id',            title: 'ID',          alwaysOn: true },
  { key: 'title_t',       title: 'Name',         alwaysOn: true },
  { key: 'type_s',        title: 'Type',         alwaysOn: true },
  { key: 'source_t',      title: 'Source' },
  { key: 'upstream_ss',   title: 'Upstream' },
  { key: 'downstream_ss', title: 'Downstream' },
  { key: 'doi_ss',        title: 'References' },
  { key: 'biological_object_ids_ss',  title: 'Bio object' },
  { key: 'biological_process_ids_ss', title: 'Bio process' },
  { key: 'biological_action_ids_ss',  title: 'Bio action' },
  { key: 'score',         title: 'Score' },
];

function hasData(rows, key) {
  return rows.some(r => {
    const v = r[key];
    return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
  });
}

function IdCell({ id, onSetId }) {
  const url = aopWikiUrl(id);
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {url
        ? <a href={url} target="_blank" rel="noreferrer">{id}</a>
        : id}
      {' '}
      <a href="#" title={`Set ID filter to '${id}'`}
        onClick={e => { e.preventDefault(); onSetId(id); }}
        style={{ color: '#aaa', fontSize: '0.8em' }}>
        <i className="fa fa-copy" />
      </a>
    </span>
  );
}

function AopLinksCell({ data }) {
  if (!Array.isArray(data)) return null;
  return (
    <>
      {data.map((id, i) => {
        const url = aopWikiUrl(id);
        return (
          <span key={i}>
            {i > 0 && ', '}
            {url ? <a href={url} target="_blank" rel="noreferrer">{id}</a> : id}
          </span>
        );
      })}
    </>
  );
}

function DoiCell({ data }) {
  if (!Array.isArray(data)) return null;
  return (
    <>
      {data.map((doi, i) => (
        <span key={i}>
          {i > 0 && ', '}
          <a href={`https://doi.org/${doi}`} target="_blank" rel="noreferrer">{doi}</a>
        </span>
      ))}
    </>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`type-badge ${typeBadgeClass(type)}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

function renderCell(col, row, onSetId) {
  const val = row[col.key];
  switch (col.key) {
    case 'id':      return <IdCell id={val} onSetId={onSetId} />;
    case 'title_t': return val || row.short_name_t || row.name_t || row.preferred_name_t || '';
    case 'type_s':  return val ? <TypeBadge type={val} /> : '';
    case 'upstream_ss': case 'downstream_ss': return <AopLinksCell data={val} />;
    case 'doi_ss':  return <DoiCell data={val} />;
    case 'biological_object_ids_ss':
    case 'biological_process_ids_ss':
    case 'biological_action_ids_ss':
      return Array.isArray(val) ? val.join(', ') : (val || '');
    case 'score':
      return typeof val === 'number' ? val.toFixed(3) : (val || '');
    default: return val || '';
  }
}

export default function ResultsTable({
  rows, total, loading, error,
  page, setPage,
  pageSize, setPageSize,
  sortField, sortDir, onSort,
  onSetFieldId, onRowClick,
  selectedId,
  isSorted,          // true when sort is active (hides score col)
}) {
  // Derive visible columns: auto-hide empty ones
  const [userHidden, setUserHidden] = useState(new Set());
  const [showColToggle, setShowColToggle] = useState(false);

  const visibleCols = ALL_COLUMNS.filter(col => {
    if (userHidden.has(col.key)) return false;
    if (col.alwaysOn) return true;
    // Auto-hide score when sorting by a field
    if (col.key === 'score' && isSorted) return false;
    // Auto-hide empty columns
    if (rows.length > 0 && !hasData(rows, col.key)) return false;
    return true;
  });

  function toggleCol(key) {
    setUserHidden(s => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Toolbar */}
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <span className="text-muted small">
          {loading
            ? <><span className="spinner-border spinner-border-sm me-1" />Loading…</>
            : `${total.toLocaleString()} result${total !== 1 ? 's' : ''}`}
        </span>
        <div className="d-flex align-items-center gap-2">
          {/* Column visibility toggle */}
          <div className="position-relative">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowColToggle(s => !s)}
              title="Show/hide columns"
            >
              <i className="fa fa-columns me-1" />Columns
            </button>
            {showColToggle && (
              <div className="col-toggle-dropdown">
                {ALL_COLUMNS.filter(c => !c.alwaysOn).map(col => (
                  <label key={col.key} className="col-toggle-item">
                    <input
                      type="checkbox"
                      checked={!userHidden.has(col.key)}
                      onChange={() => toggleCol(col.key)}
                    />
                    {' '}{col.title}
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="small mb-0">Rows:</label>
          <select
            className="form-select form-select-sm"
            style={{ width: '75px' }}
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small">
          <i className="fa fa-exclamation-triangle me-2" />
          <strong>Solr error:</strong> {error}
        </div>
      )}

      <div className="aop-table-wrap">
        <table className="aop-table">
          <thead>
            <tr>
              {visibleCols.map(col => (
                <th key={col.key} onClick={() => onSort(col.key)}>
                  {col.title}
                  {sortField === col.key
                    ? <i className={`fa fa-sort-${sortDir === 'asc' ? 'up' : 'down'} ms-1`} />
                    : <i className="fa fa-sort ms-1 text-muted" style={{ fontSize: '0.7em' }} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={visibleCols.length} className="text-center text-muted py-4">
                  No results found.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id || i}
                className={selectedId === row.id ? 'row-selected' : ''}
                onClick={() => onRowClick && onRowClick(row)}
                style={{ cursor: 'pointer' }}
              >
                {visibleCols.map(col => (
                  <td key={col.key}>
                    {renderCell(col, row, onSetFieldId)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-2" aria-label="Results pages">
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
