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

const TIMEOUT_MS = 30_000;

/** Fetch with combined caller signal + timeout */
async function solrFetch(url, options = {}) {
  const { signal: callerSignal, ...rest } = options;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);

  // AbortSignal.any() is available in all modern browsers
  const signal = callerSignal
    ? AbortSignal.any([callerSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const res = await fetch(url, { ...rest, signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        msg = body?.error?.msg || JSON.stringify(body?.error) || msg;
      } catch { /* ignore parse error */ }
      throw new Error(msg);
    }

    const data = await res.json();

    // Solr returns 200 with an error key on bad queries
    if (data?.error) {
      throw new Error(data.error.msg || JSON.stringify(data.error));
    }

    return data;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

/** Build URLSearchParams from search state. Async because similarity needs a vector fetch. */
export async function buildSolrParams(state) {
  const { q = '', fieldId = '', graph = '0', types = [], filters = {} } = state;

  let qValue = q.trim() || '*:*';

  // Additional field clauses
  const clauses = [];
  if (fieldId.trim()) clauses.push(`id:${fieldId.trim()}`);

  const filterFields = [
    'biological_object_ids_ss', 'biological_process_ids_ss',
    'biological_action_ids_ss', 'biological_organization_level_t',
    'attr_organ_term', 'attr_cell_term',
    'molecular_initiating_event_ss', 'adverse_outcome_ss',
    'attr_assays', 'casrn_s', 'attr_applicability_taxonomy', 'doi_ss',
  ];

  for (const field of filterFields) {
    const val = filters[field]?.trim();
    if (val) {
      const parts = val.split('|');
      const code = parts[parts.length - 1].trim();
      clauses.push(`${field}:${code}`);
    }
  }

  if (clauses.length > 0) {
    const extra = clauses.join(' AND ');
    qValue = qValue === '*:*' ? extra : `(${qValue}) AND ${extra}`;
  }

  // Graph expansion
  if (graph === 'similarity') {
    const vector = await fetchVectorById(qValue);
    if (vector) {
      qValue = `{!knn f=spectrum_p2048 topK=10}[${vector.map(v => v.toFixed(3)).join(',')}]`;
    }
  } else if (graph === 'AOP') {
    qValue = `({!join from=key_event_ss to=id}${qValue} OR {!join from=adverse_outcome_ss to=id}${qValue} OR {!join from=molecular_initiating_event_ss to=id}${qValue} OR {!join from=aop_stressor_ss to=id}${qValue} OR ${qValue})`;
  } else if (graph === 'AOPextended') {
    qValue = `{!graph from=id to=upstream_ss maxDepth=1 returnRoot=true}({!join from=key_event_ss to=id}${qValue} OR {!join from=adverse_outcome_ss to=id}${qValue} OR {!join from=molecular_initiating_event_ss to=id}${qValue} OR {!join from=aop_stressor_ss to=id}${qValue} OR ${qValue})`;
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
      const dir = depth > 0 ? 'upstream_ss' : 'downstream_ss';
      qValue = Math.abs(depth) > 100
        ? `{!graph from=id to=${dir} returnRoot=true}(${qValue})`
        : `{!graph from=id to=${dir} returnRoot=true maxDepth=${Math.abs(depth)}}(${qValue})`;
    } else {
      qValue = `(${qValue})`;
    }
  }

  const params = new URLSearchParams();
  params.append('q', qValue);
  if (types.length > 0) params.append('fq', `type_s:(${types.join(' OR ')})`);
  params.append('wt', 'json');
  params.append('fl', FL);
  // Request type_s facets on every query
  params.append('facet', 'true');
  params.append('facet.field', 'type_s');
  params.append('facet.mincount', '1');

  return params;
}

/** Fetch one result page. Signal is optional (AbortController). */
export async function fetchSolrPage(params, start, rows, sortField, sortDir, signal) {
  const p = new URLSearchParams(params);
  p.set('start', start);
  p.set('rows', rows);
  if (sortField) p.set('sort', `${sortField} ${sortDir}`);
  return solrFetch(SOLR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p.toString(),
    signal,
  });
}

/** Max nodes to render in the graph. Above this show a warning + truncate. */
export const GRAPH_NODE_CAP = 500;

/** Fetch all docs for graph/download. */
export async function fetchAllResults(params, signal) {
  const p = new URLSearchParams(params);
  p.set('start', 0);
  p.set('rows', 10000);
  p.delete('facet');
  p.delete('facet.field');
  p.delete('facet.mincount');
  const data = await solrFetch(`${SOLR_URL}?${p.toString()}`, { signal });
  return data?.response?.docs || [];
}

/** Fetch embedding vector for similarity search */
export async function fetchVectorById(docId, vectorEmbedding = 'spectrum_p2048') {
  try {
    const url = new URL(SOLR_URL);
    url.searchParams.set('q', docId);
    url.searchParams.set('fl', vectorEmbedding);
    url.searchParams.set('wt', 'json');
    url.searchParams.set('rows', 1);
    const data = await solrFetch(url.toString());
    return data?.response?.docs?.[0]?.[vectorEmbedding] || null;
  } catch {
    return null;
  }
}

/** Facet-based autocomplete suggestions */
export async function fetchFacetSuggestions(facetField, prefix) {
  const url = new URL(SOLR_URL);
  url.searchParams.set('q', '*:*');
  url.searchParams.set('rows', 0);
  url.searchParams.set('wt', 'json');
  url.searchParams.set('facet', 'true');
  url.searchParams.set('facet.field', facetField);
  url.searchParams.set('facet.prefix', prefix);
  url.searchParams.set('facet.limit', 10);
  try {
    const data = await solrFetch(url.toString());
    const arr = data?.facet_counts?.facet_fields?.[facetField] || [];
    const out = [];
    for (let i = 0; i < arr.length; i += 2) if (arr[i]) out.push(arr[i]);
    return out;
  } catch { return []; }
}

/** Doc-based autocomplete suggestions */
export async function fetchDocSuggestions(labelField, codeField, fq, query) {
  const url = new URL(SOLR_URL);
  url.searchParams.set('q', `${query}*`);
  url.searchParams.set('fq', fq);
  url.searchParams.set('fl', codeField ? `${labelField},${codeField}` : labelField);
  url.searchParams.set('rows', 10);
  url.searchParams.set('wt', 'json');
  try {
    const data = await solrFetch(url.toString());
    const seen = new Set();
    const out = [];
    for (const doc of data?.response?.docs || []) {
      let val = doc[labelField];
      if (codeField && doc[codeField]) val = `${val} | ${doc[codeField]}`;
      for (const v of (Array.isArray(val) ? val : [val])) {
        if (v && !seen.has(v)) { seen.add(v); out.push(v); }
      }
    }
    return out;
  } catch { return []; }
}

/** Generate Python snippet */
export function generatePythonCode(paramsString) {
  const obj = Object.fromEntries(new URLSearchParams(paramsString));
  // Strip internal facet params
  ['facet', 'facet.field', 'facet.mincount'].forEach(k => delete obj[k]);
  const lines = Object.entries(obj).map(
    ([k, v]) => `    '${k}': '${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',`
  );
  return `import requests
import json

solr_url = "${SOLR_URL}"
params = {
${lines.join('\n')}
}
response = requests.get(solr_url, params=params)
data = response.json()
print(json.dumps(data, indent=2))`;
}

/** Build a CSV blob URL from a docs array */
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
