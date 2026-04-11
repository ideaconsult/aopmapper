export const SOLR_URL = 'https://api.ideaconsult.net/enanomapper/aop';

export const FL =
  'score,id,title_t,name_t,short_name_t,description_t,type_s,' +
  'point_of_contact_t,oecd_project_t,oecd_status_t,source_t,' +
  'doi_ss,upstream_ss,downstream_ss,molecular_initiating_event_ss,' +
  'adverse_outcome_ss,attr_biological_events,attr_organ_term,' +
  'attr_cell_term,biological_object_ids_ss,biological_process_ids_ss,' +
  'biological_action_ids_ss,biological_triple_ids_ss,biological_triple_size_d,' +
  'biological_organization_level_t,attr_assays,casrn_s,' +
  'preferred_name_t,dsstox_id_s,jchem_inchi_key_s';

/**
 * Build a URLSearchParams for the Solr query based on search state.
 * Returns params (without start/rows – caller adds those).
 */
export async function buildSolrParams(state) {
  const {
    q = '',
    fieldId = '',
    graph = '0',
    types = [],
    filters = {},
  } = state;

  // --- Build base query ---
  let qValue = q.trim() || '*:*';

  // Additional field filters (second/third form rows)
  const additionalFieldMap = {
    id: 'field_id',
    biological_object_ids_ss: 'biological_object_ids_ss',
    biological_process_ids_ss: 'biological_process_ids_ss',
    biological_action_ids_ss: 'biological_action_ids_ss',
    biological_organization_level_t: 'biological_organization_level_t',
    attr_organ_term: 'attr_organ_term',
    attr_cell_term: 'attr_cell_term',
    molecular_initiating_event_ss: 'molecular_initiating_event_ss',
    adverse_outcome_ss: 'adverse_outcome_ss',
    attr_assays: 'attr_assays',
    casrn_s: 'casrn_s',
    attr_applicability_taxonomy: 'attr_applicability_taxonomy',
    doi_ss: 'doi_ss',
  };

  const clauses = [];

  // field_id handling
  if (fieldId.trim()) {
    clauses.push(`id:${fieldId.trim()}`);
  }

  for (const [solrField] of Object.entries(additionalFieldMap)) {
    if (solrField === 'id') continue; // handled above
    const val = filters[solrField]?.trim();
    if (val) {
      // strip trailing " | CODE" pattern (autocomplete returns "label | CODE")
      const parts = val.split('|');
      const code = parts[parts.length - 1].trim();
      clauses.push(`${solrField}:${code}`);
    }
  }

  if (clauses.length > 0) {
    const extra = clauses.join(' AND ');
    qValue = qValue === '*:*' ? extra : `(${qValue}) AND ${extra}`;
  }

  // --- Graph expansion ---
  if (graph === 'similarity') {
    const vector = await fetchVectorById(qValue);
    if (vector) {
      const vectorStr = vector.map(v => v.toFixed(3)).join(',');
      qValue = `{!knn f=spectrum_p2048 topK=10}[${vectorStr}]`;
    }
  } else if (graph === 'AOP') {
    qValue =
      `({!join from=key_event_ss to=id}${qValue}` +
      ` OR {!join from=adverse_outcome_ss to=id}${qValue}` +
      ` OR {!join from=molecular_initiating_event_ss to=id}${qValue}` +
      ` OR {!join from=aop_stressor_ss to=id}${qValue}` +
      ` OR ${qValue})`;
  } else if (graph === 'AOPextended') {
    qValue =
      `{!graph from=id to=upstream_ss maxDepth=1 returnRoot=true}` +
      `({!join from=key_event_ss to=id}${qValue}` +
      ` OR {!join from=adverse_outcome_ss to=id}${qValue}` +
      ` OR {!join from=molecular_initiating_event_ss to=id}${qValue}` +
      ` OR {!join from=aop_stressor_ss to=id}${qValue}` +
      ` OR ${qValue})`;
  } else if (graph === 'MIE') {
    qValue = `({!join from=molecular_initiating_event_ss to=id}${qValue} OR ${qValue})`;
  } else if (graph === 'AO') {
    qValue = `({!join from=adverse_outcome_ss to=id}${qValue} OR ${qValue})`;
  } else if (graph === 'KE') {
    qValue = `({!join from=key_event_ss to=id}${qValue} OR ${qValue})`;
  } else if (graph === 'Stressors') {
    qValue = `({!join from=aop_stressor_ss to=id}${qValue} OR ${qValue})`;
  } else {
    const depth = parseInt(graph, 10);
    if (!isNaN(depth) && depth !== 0) {
      const direction = depth > 0 ? 'upstream_ss' : 'downstream_ss';
      if (Math.abs(depth) > 100) {
        qValue = `{!graph from=id to=${direction} returnRoot=true}(${qValue})`;
      } else {
        qValue = `{!graph from=id to=${direction} returnRoot=true maxDepth=${Math.abs(depth)}}(${qValue})`;
      }
    } else {
      qValue = `(${qValue})`;
    }
  }

  const params = new URLSearchParams();
  params.append('q', qValue);

  if (types.length > 0) {
    params.append('fq', `type_s:(${types.join(' OR ')})`);
  }

  params.append('wt', 'json');
  params.append('fl', FL);

  return params;
}

/** Fetch a single page from Solr */
export async function fetchSolrPage(params, start, rows, sortField, sortDir) {
  const p = new URLSearchParams(params);
  p.set('start', start);
  p.set('rows', rows);
  if (sortField) p.set('sort', `${sortField} ${sortDir}`);

  const res = await fetch(SOLR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p.toString(),
  });
  if (!res.ok) throw new Error(`Solr HTTP ${res.status}`);
  return res.json();
}

/** Fetch all results for graph/download (up to 10000) */
export async function fetchAllResults(params) {
  const p = new URLSearchParams(params);
  p.set('start', 0);
  p.set('rows', 10000);
  const res = await fetch(`${SOLR_URL}?${p.toString()}`);
  if (!res.ok) throw new Error(`Solr HTTP ${res.status}`);
  const data = await res.json();
  return data?.response?.docs || [];
}

/** Fetch vector for similarity search */
export async function fetchVectorById(docId, vectorEmbedding = 'spectrum_p2048') {
  const url = new URL(SOLR_URL);
  url.searchParams.set('q', docId);
  url.searchParams.set('fl', vectorEmbedding);
  url.searchParams.set('wt', 'json');
  url.searchParams.set('rows', 1);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data?.response?.docs?.[0];
  return doc?.[vectorEmbedding] || null;
}

/** Fetch facet suggestions (for facet-based autocomplete) */
export async function fetchFacetSuggestions(facetField, prefix) {
  const url = new URL(SOLR_URL);
  url.searchParams.set('q', '*:*');
  url.searchParams.set('rows', 0);
  url.searchParams.set('wt', 'json');
  url.searchParams.set('facet', 'true');
  url.searchParams.set('facet.field', facetField);
  url.searchParams.set('facet.prefix', prefix);
  url.searchParams.set('facet.limit', 10);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  const arr = data?.facet_counts?.facet_fields?.[facetField] || [];
  const results = [];
  for (let i = 0; i < arr.length; i += 2) {
    if (arr[i]) results.push(arr[i]);
  }
  return results;
}

/** Fetch doc-based autocomplete suggestions */
export async function fetchDocSuggestions(labelField, codeField, fq, query) {
  const url = new URL(SOLR_URL);
  url.searchParams.set('q', `${query}*`);
  url.searchParams.set('fq', fq);
  const fl = codeField ? `${labelField},${codeField}` : labelField;
  url.searchParams.set('fl', fl);
  url.searchParams.set('rows', 10);
  url.searchParams.set('wt', 'json');
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  const seen = new Set();
  const results = [];
  for (const doc of data?.response?.docs || []) {
    let val = doc[labelField];
    if (codeField && doc[codeField]) val = `${val} | ${doc[codeField]}`;
    const vals = Array.isArray(val) ? val : [val];
    for (const v of vals) {
      if (v && !seen.has(v)) { seen.add(v); results.push(v); }
    }
  }
  return results;
}

/** Generate Python snippet for debug tab */
export function generatePythonCode(params) {
  const obj = Object.fromEntries(new URLSearchParams(params));
  const lines = Object.entries(obj).map(
    ([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}',`
  );
  return `import requests
import json

solr_url = "https://api.ideaconsult.net/enanomapper/aop"
params = {
${lines.join('\n')}
}
response = requests.get(solr_url, params=params)
data = response.json()
print(json.dumps(data, indent=2))`;
}

/** Build CSV blob URL from docs array */
export function buildCsvUrl(docs) {
  if (!docs?.length) return null;
  const keys = [...new Set(docs.flatMap(d => Object.keys(d)))];
  const rows = [keys.join(',')];
  for (const doc of docs) {
    const vals = keys.map(k => {
      let v = doc[k];
      if (Array.isArray(v)) v = v.join('|');
      if (v == null) v = '';
      v = String(v).replace(/"/g, '""');
      if (/[",\n]/.test(v)) v = `"${v}"`;
      return v;
    });
    rows.push(vals.join(','));
  }
  return URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
}
