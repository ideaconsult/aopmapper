import { aopWikiUrl, TYPE_LABELS, typeBadgeClass } from '../utils/aopLinks.js';

const FIELD_LABELS = {
  title_t: 'Title',
  name_t: 'Name',
  short_name_t: 'Short name',
  description_t: 'Description',
  type_s: 'Type',
  source_t: 'Source',
  point_of_contact_t: 'Point of contact',
  oecd_project_t: 'OECD project',
  oecd_status_t: 'OECD status',
  biological_organization_level_t: 'Biological organisation level',
  upstream_ss: 'Upstream',
  downstream_ss: 'Downstream',
  molecular_initiating_event_ss: 'MIEs',
  adverse_outcome_ss: 'Adverse outcomes',
  biological_object_ids_ss: 'Biological objects',
  biological_process_ids_ss: 'Biological processes',
  biological_action_ids_ss: 'Biological actions',
  biological_triple_ids_ss: 'Bio event triples',
  attr_organ_term: 'Organ',
  attr_cell_term: 'Cell',
  attr_assays: 'Assays',
  casrn_s: 'CAS RN',
  preferred_name_t: 'Preferred name',
  dsstox_id_s: 'DSSTox ID',
  doi_ss: 'References (DOI)',
  score: 'Relevance score',
};

const SKIP = new Set(['id', 'jchem_inchi_key_s', 'attr_biological_events',
  'biological_triple_size_d']);

function IdLink({ id, onSearch }) {
  const url = aopWikiUrl(id);
  return (
    <span className="d-inline-flex align-items-center gap-1 me-1 mb-1">
      {url
        ? <a href={url} target="_blank" rel="noreferrer">{id}</a>
        : <span>{id}</span>}
      <button
        className="btn btn-link btn-sm p-0 ms-1"
        style={{ fontSize: '0.75rem', color: '#888' }}
        title={`Search for ${id}`}
        onClick={() => onSearch(id)}
      >
        <i className="fa fa-search" />
      </button>
    </span>
  );
}

export default function DetailPanel({ doc, onClose, onSearchId }) {
  if (!doc) return null;

  const wikiUrl = aopWikiUrl(doc.id);
  const typeClass = typeBadgeClass(doc.type_s);
  const typeLabel = TYPE_LABELS[doc.type_s] || doc.type_s;

  return (
    <div className="detail-panel">
      <div className="detail-panel__header">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {wikiUrl
            ? <a href={wikiUrl} target="_blank" rel="noreferrer" className="detail-id">{doc.id}</a>
            : <span className="detail-id">{doc.id}</span>}
          <span className={`type-badge ${typeClass}`}>{typeLabel}</span>
        </div>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={onClose}
          aria-label="Close detail panel"
        >
          <i className="fa fa-times" />
        </button>
      </div>

      <h2 className="detail-panel__title">
        {doc.title_t || doc.name_t || doc.short_name_t || doc.preferred_name_t || doc.id}
      </h2>

      {doc.description_t && (
        <div className="detail-panel__desc">
          <p>{doc.description_t}</p>
        </div>
      )}

      <table className="detail-panel__table">
        <tbody>
          {Object.entries(FIELD_LABELS).map(([field, label]) => {
            if (SKIP.has(field)) return null;
            const val = doc[field];
            if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) return null;
            if (field === 'description_t') return null; // already shown above
            if (field === 'type_s') return null; // shown in header

            return (
              <tr key={field}>
                <th>{label}</th>
                <td>
                  {field === 'doi_ss' && Array.isArray(val) ? (
                    val.map((doi, i) => (
                      <a key={i} href={`https://doi.org/${doi}`} target="_blank"
                        rel="noreferrer" className="me-2">{doi}</a>
                    ))
                  ) : Array.isArray(val) ? (
                    <div className="d-flex flex-wrap">
                      {val.map((v, i) => (
                        <IdLink key={i} id={v} onSearch={onSearchId} />
                      ))}
                    </div>
                  ) : field === 'score' ? (
                    typeof val === 'number' ? val.toFixed(4) : val
                  ) : (
                    String(val)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
