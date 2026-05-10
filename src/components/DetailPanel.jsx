import { aopWikiUrl, TYPE_LABELS, typeBadgeClass } from '../utils/aopLinks.js';

const FIELD_LABELS = {
  // ── common ──────────────────────────────────────────────────────────────────
  title_t:                          'Title',
  name_t:                           'Name',
  short_name_t:                     'Short name',
  description_t:                    'Description',
  type_s:                           'Type',
  source_t:                         'Source',
  point_of_contact_t:               'Point of contact',
  oecd_project_t:                   'OECD project',
  oecd_status_t:                    'OECD status',
  doi_ss:                           'References (DOI)',
  score:                            'Relevance score',

  // ── KE ──────────────────────────────────────────────────────────────────────
  biological_organization_level_t:  'Biological organisation level',
  upstream_ss:                      'Upstream',
  downstream_ss:                    'Downstream',
  molecular_initiating_event_ss:    'MIEs',
  adverse_outcome_ss:               'Adverse outcomes',
  biological_object_ids_ss:         'Biological objects',
  biological_process_ids_ss:        'Biological processes',
  biological_action_ids_ss:         'Biological actions',
  biological_triple_ids_ss:         'Bio event triples',
  attr_organ_term:                  'Organ',
  attr_cell_term:                   'Cell',
  attr_assays:                      'Assays',

  // ── Chemical / Stressor ─────────────────────────────────────────────────────
  casrn_s:                          'CAS RN',
  preferred_name_t:                 'Preferred name',
  dsstox_id_s:                      'DSSTox ID',

  // ── KER ─────────────────────────────────────────────────────────────────────
  weight_of_evidence_value_t:                              'WoE overall',
  weight_of_evidence_biological_plausibility_t:            'WoE biological plausibility',
  weight_of_evidence_emperical_support_linkage_t:          'WoE empirical support',
  weight_of_evidence_uncertainties_or_inconsistencies_t:   'WoE uncertainties',
  quantitative_understanding_description_t:                'Quantitative understanding',
  quantitative_understanding_time_scale_t:                 'Time scale',
  quantitative_understanding_response_response_relationship_t: 'Dose-response relationship',
  known_modulating_factors_t:                              'Modulating factors',
  evidence_collection_strategy_t:                          'Evidence collection strategy',
};

const SKIP = new Set([
  'id', 'jchem_inchi_key_s', 'attr_biological_events',
  'biological_triple_size_d', 'type_s', 'description_t',
  // KER nested objects already flattened into *_t fields above
  'weight_of_evidence', 'quantitative_understanding',
  // internal graph fields not useful in the panel
  'indirect_upstream_ss', 'indirect_downstream_ss',
  'MIE_ss', 'key_event_ss', 'aop_stressor_ss',
]);

// Fields that contain arrays of AOP-Wiki IDs — rendered as linked chips
const ID_ARRAY_FIELDS = new Set([
  'upstream_ss', 'downstream_ss',
  'molecular_initiating_event_ss', 'adverse_outcome_ss',
  'biological_object_ids_ss', 'biological_process_ids_ss',
  'biological_action_ids_ss', 'biological_triple_ids_ss',
]);

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

function renderValue(field, val, onSearchId) {
  if (field === 'doi_ss' && Array.isArray(val)) {
    return val.map((doi, i) => (
      <a key={i} href={`https://doi.org/${doi}`} target="_blank"
        rel="noreferrer" className="me-2">{doi}</a>
    ));
  }

  if (ID_ARRAY_FIELDS.has(field) && Array.isArray(val)) {
    return (
      <div className="d-flex flex-wrap">
        {val.map((v, i) => <IdLink key={i} id={v} onSearch={onSearchId} />)}
      </div>
    );
  }

  if (Array.isArray(val)) {
    return val.join(', ');
  }

  if (field === 'score') {
    return typeof val === 'number' ? val.toFixed(4) : val;
  }

  // Long text fields — render with whitespace preserved, truncated to 5 lines
  if (typeof val === 'string' && val.length > 200) {
    return (
      <span style={{
        display: '-webkit-box', WebkitLineClamp: 5,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
        whiteSpace: 'pre-wrap',
      }}>
        {val}
      </span>
    );
  }

  return String(val);
}

export default function DetailPanel({ doc, onClose, onSearchId }) {
  if (!doc) return null;

  const wikiUrl   = aopWikiUrl(doc.id);
  const typeClass = typeBadgeClass(doc.type_s);
  const typeLabel = TYPE_LABELS[doc.type_s] || doc.type_s;
  const isKer     = doc.type_s === 'key_event_relationship';

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

      {/* KER: show upstream → downstream as a prominent link chain */}
      {isKer && (doc.upstream_ss?.length || doc.downstream_ss?.length) && (
        <div className="detail-panel__desc d-flex align-items-center gap-2 flex-wrap">
          {(doc.upstream_ss || []).map(id => (
            <IdLink key={id} id={id} onSearch={onSearchId} />
          ))}
          <i className="fa fa-arrow-right text-muted" />
          {(doc.downstream_ss || []).map(id => (
            <IdLink key={id} id={id} onSearch={onSearchId} />
          ))}
        </div>
      )}

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
            // Already shown above
            if (field === 'description_t') return null;
            if (field === 'type_s') return null;
            // For KER, upstream/downstream already shown in the chain above
            if (isKer && (field === 'upstream_ss' || field === 'downstream_ss')) return null;

            return (
              <tr key={field}>
                <th>{label}</th>
                <td>{renderValue(field, val, onSearchId)}</td>
              </tr>
            );
          })}

          {/* Any remaining fields not in FIELD_LABELS and not in SKIP */}
          {Object.entries(doc)
            .filter(([f]) => !FIELD_LABELS[f] && !SKIP.has(f) && f !== 'id')
            .filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0))
            .map(([f, v]) => (
              <tr key={f}>
                <th style={{ color: '#aaa' }}>{f}</th>
                <td style={{ color: '#aaa' }}>
                  {Array.isArray(v) ? v.join(', ') : String(v)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
