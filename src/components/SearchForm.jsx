import AutocompleteInput from './AutocompleteInput.jsx';
import { TYPE_LABELS } from '../utils/aopLinks.js';

const GRAPH_OPTIONS = [
  { value: '999',         label: 'Upstream (ALL)' },
  { value: '5',           label: 'Upstream 5' },
  { value: '4',           label: 'Upstream 4' },
  { value: '3',           label: 'Upstream 3' },
  { value: '2',           label: 'Upstream 2' },
  { value: '1',           label: 'Upstream 1' },
  { value: '0',           label: 'None' },
  { value: '-1',          label: 'Downstream -1' },
  { value: '-2',          label: 'Downstream -2' },
  { value: '-3',          label: 'Downstream -3' },
  { value: '-4',          label: 'Downstream -4' },
  { value: '-5',          label: 'Downstream -5' },
  { value: '-999',        label: 'Downstream (ALL)' },
  { value: 'AOP',         label: 'AOP graph' },
  { value: 'AOPextended', label: 'AOP extended' },
  { value: 'MIE',         label: 'MIE by AOP' },
  { value: 'AO',          label: 'AO by AOP' },
  { value: 'KE',          label: 'KE by AOP' },
  { value: 'Stressors',   label: 'Stressors by AOP' },
  { value: 'similarity',  label: 'Similarity' },
];

export default function SearchForm({ state, onChange, onSubmit }) {
  const { q, fieldId, graph, types, filters } = state;

  function setFilter(field, val) {
    onChange({ filters: { ...filters, [field]: val } });
  }

  function toggleType(type) {
    const next = types.includes(type)
      ? types.filter(t => t !== type)
      : [...types, type];
    onChange({ types: next });
  }

  function selectAllTypes() {
    onChange({ types: Object.keys(TYPE_LABELS) });
  }

  function clearAllTypes() {
    onChange({ types: [] });
  }

  return (
    <form
      className="aop-search-form"
      onSubmit={e => { e.preventDefault(); onSubmit(); }}
    >
      {/* Row 1 */}
      <div className="mb-3 row align-items-end g-2">
        <div className="col-md-5">
          <label htmlFor="q" className="form-label">Free text search</label>
          <input
            type="text"
            id="q"
            className="form-control"
            placeholder="e.g., neutrophils"
            value={q}
            onChange={e => onChange({ q: e.target.value })}
          />
        </div>
        <div className="col-md-2">
          <label htmlFor="fieldId" className="form-label"
            title="AOP Wiki identifier e.g. AOP144, KE1696, KER1">ID</label>
          <input
            type="text"
            id="fieldId"
            className="form-control"
            placeholder="e.g., KE1696"
            value={fieldId}
            onChange={e => onChange({ fieldId: e.target.value })}
          />
        </div>
        <div className="col-md-2">
          <label htmlFor="graph" className="form-label">Graph Traversal</label>
          <select
            id="graph"
            className="form-select"
            value={graph}
            onChange={e => onChange({ graph: e.target.value })}
          >
            {GRAPH_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3 d-flex align-items-end gap-2">
          <button type="submit" className="btn btn-aop">
            <i className="fa fa-search me-1" />AOP Wiki Search
          </button>
          <a
            href="https://forms.gle/h6xwjhzeqshjh53p7"
            target="_blank" rel="noreferrer"
            title="Feedback"
            style={{ color: 'var(--aop-primary)', fontSize: '1.2rem' }}
          >
            <i className="fa fa-comment" />
          </a>
        </div>
      </div>

      {/* Row 2: KE filters */}
      <div className="mb-3 row g-2" title="Key event filters">
        <div className="col-md-2">
          <AutocompleteInput id="field_bio_obj" name="field_bio_obj" label="Biological Object"
            placeholder="type for suggestions"
            value={filters.biological_object_ids_ss || ''} onChange={v => setFilter('biological_object_ids_ss', v)}
            mode="doc" labelField="name_t" codeField="id" fq="type_s:(biological_object)" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_bio_proc" name="field_bio_proc" label="Biological Process"
            placeholder="type for suggestions"
            value={filters.biological_process_ids_ss || ''} onChange={v => setFilter('biological_process_ids_ss', v)}
            mode="doc" labelField="name_t" codeField="id" fq="type_s:(biological_process)" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_bio_act" name="field_bio_act" label="Biological Action"
            placeholder="type for suggestions"
            value={filters.biological_action_ids_ss || ''} onChange={v => setFilter('biological_action_ids_ss', v)}
            mode="doc" labelField="name_t" codeField="id" fq="type_s:(biological_action)" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_bio_org" name="field_bio_org" label="Biological Organisation"
            placeholder="type for suggestions"
            value={filters.biological_organization_level_t || ''} onChange={v => setFilter('biological_organization_level_t', v)}
            mode="facet" facetField="biological_organization_level_t" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_organ" name="field_organ" label="Organ"
            placeholder="type for suggestions"
            value={filters.attr_organ_term || ''} onChange={v => setFilter('attr_organ_term', v)}
            mode="facet" facetField="attr_organ_term" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_cell" name="field_cell" label="Cell"
            placeholder="type for suggestions"
            value={filters.attr_cell_term || ''} onChange={v => setFilter('attr_cell_term', v)}
            mode="facet" facetField="attr_cell_term" />
        </div>
      </div>

      {/* Row 3: more filters */}
      <div className="mb-3 row g-2">
        <div className="col-md-2">
          <AutocompleteInput id="field_taxonomy" name="field_taxonomy" label="Applicability taxonomy"
            placeholder="e.g., human"
            value={filters.attr_applicability_taxonomy || ''} onChange={v => setFilter('attr_applicability_taxonomy', v)}
            mode="doc" labelField="attr_applicability_taxonomy" fq="type_s:aop" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_mie" name="field_mie" label="MIE"
            placeholder="e.g. KE1495"
            value={filters.molecular_initiating_event_ss || ''} onChange={v => setFilter('molecular_initiating_event_ss', v)}
            mode="doc" labelField="title_t" codeField="id" fq="type_s:key_event AND MIE_ss:*" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_ao" name="field_ao" label="Adverse Outcomes"
            placeholder="e.g. KE1458"
            value={filters.adverse_outcome_ss || ''} onChange={v => setFilter('adverse_outcome_ss', v)}
            mode="doc" labelField="title_t" codeField="id" fq="type_s:(key_event aop) AND adverse_outcome_ss:*" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_assay" name="field_assay" label="Measurement Methodology"
            placeholder="e.g., DAPI"
            value={filters.attr_assays || ''} onChange={v => setFilter('attr_assays', v)}
            mode="doc" labelField="name_t" fq="type_s:assay" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_cas" name="field_cas" label="Chemical name/CAS RN"
            placeholder="e.g., 134098-61-6"
            value={filters.casrn_s || ''} onChange={v => setFilter('casrn_s', v)}
            mode="doc" labelField="preferred_name_t" codeField="casrn_s" fq="type_s:chemical" />
        </div>
        <div className="col-md-2">
          <AutocompleteInput id="field_doi" name="field_doi" label="DOI"
            placeholder="e.g. 10.3389/ftox.2021.653386"
            value={filters.doi_ss || ''} onChange={v => setFilter('doi_ss', v)}
            mode="facet" facetField="doi_ss" />
        </div>
      </div>

      {/* Row 4: result types */}
      <div className="mb-0 row align-items-center g-2">
        <div className="col-auto">
          <span className="form-label mb-0 fw-semibold">Result types</span>
        </div>
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <div key={value} className="col-auto">
            <div className="form-check form-check-inline mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id={`type_${value}`}
                checked={types.includes(value)}
                onChange={() => toggleType(value)}
              />
              <label className="form-check-label" htmlFor={`type_${value}`}>{label}</label>
            </div>
          </div>
        ))}
        <div className="col-auto ms-2 d-flex gap-1">
          <button type="button" className="btn btn-sm btn-outline-secondary py-0"
            onClick={selectAllTypes}>All</button>
          <button type="button" className="btn btn-sm btn-outline-secondary py-0"
            onClick={clearAllTypes}>None</button>
        </div>
      </div>
    </form>
  );
}
