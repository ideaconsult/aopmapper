import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildSolrParams, fetchSolrPage, fetchAllResults } from '../utils/solr.js';

/**
 * Central search hook. Owns:
 *  - form state (synced to URL)
 *  - paged result fetch (table)
 *  - full result cache (graph / download)
 *  - AbortController per request
 *  - Solr error surfacing
 */

const DEFAULT_TYPES = ['aop', 'key_event'];

function stateFromParams(params) {
  return {
    q:       params.get('q')       || '',
    fieldId: params.get('fieldId') || '',
    graph:   params.get('graph')   || '0',
    types:   params.get('types')   ? params.get('types').split(',') : DEFAULT_TYPES,
    filters: params.get('filters') ? JSON.parse(decodeURIComponent(params.get('filters'))) : {},
  };
}

function stateToParams(state) {
  const p = {};
  if (state.q)       p.q       = state.q;
  if (state.fieldId) p.fieldId = state.fieldId;
  if (state.graph && state.graph !== '0') p.graph = state.graph;
  const types = state.types || [];
  const sameAsDefault = types.length === DEFAULT_TYPES.length &&
    DEFAULT_TYPES.every(t => types.includes(t));
  if (!sameAsDefault) p.types = types.join(',');
  const filters = state.filters || {};
  if (Object.values(filters).some(Boolean))
    p.filters = encodeURIComponent(JSON.stringify(filters));
  return p;
}

export function useAopSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Form state mirrors URL
  const [formState, setFormState] = useState(() => stateFromParams(searchParams));

  // Whether a search has been executed
  const [submitted, setSubmitted] = useState(() => searchParams.toString() !== '');

  // Paged results
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  // Full result cache for graph/download
  const [fullDocs, setFullDocs]         = useState([]);
  const [fullLoading, setFullLoading]   = useState(false);
  const [fullError, setFullError]       = useState(null);

  // Built params (shared between table + graph)
  const [solrParams, setSolrParams] = useState(null);

  // Abort controllers
  const pageAbortRef = useRef(null);
  const fullAbortRef = useRef(null);

  // Facet counts by type_s
  const [facets, setFacets] = useState({});

  /** Update form state only (no fetch) */
  function updateForm(patch) {
    setFormState(s => ({ ...s, ...patch }));
  }

  /** Execute search: build params, push URL, fetch page 1 + facets */
  const search = useCallback(async (overrideState) => {
    const state = overrideState || formState;

    // Push to URL
    setSearchParams(stateToParams(state), { replace: false });
    setSubmitted(true);

    // Reset full cache
    setFullDocs([]);
    setFullError(null);

    let params;
    try {
      params = await buildSolrParams(state);
    } catch (e) {
      setError(`Query build error: ${e.message}`);
      return;
    }

    setSolrParams(params);
    return params;
  }, [formState, setSearchParams]);

  /** Fetch a page (called by ResultsTable) */
  const fetchPage = useCallback(async (params, start, rows, sortField, sortDir) => {
    if (pageAbortRef.current) pageAbortRef.current.abort();
    const controller = new AbortController();
    pageAbortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchSolrPage(params, start, rows, sortField, sortDir, controller.signal);

      if (data.error) {
        throw new Error(data.error.msg || JSON.stringify(data.error));
      }

      setRows(data.response?.docs || []);
      setTotal(data.response?.numFound || 0);

      // Extract facets if present
      const ff = data.facet_counts?.facet_fields?.type_s;
      if (ff) {
        const f = {};
        for (let i = 0; i < ff.length; i += 2) f[ff[i]] = ff[i + 1];
        setFacets(f);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message);
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /** Fetch all docs for graph/download (cached) */
  const fetchFull = useCallback(async (params) => {
    if (fullDocs.length > 0) return; // already cached
    if (fullAbortRef.current) fullAbortRef.current.abort();
    const controller = new AbortController();
    fullAbortRef.current = controller;

    setFullLoading(true);
    setFullError(null);
    try {
      const docs = await fetchAllResults(params, controller.signal);
      setFullDocs(docs);
    } catch (e) {
      if (e.name !== 'AbortError') setFullError(e.message);
    } finally {
      setFullLoading(false);
    }
  }, [fullDocs]);

  /** Load an example query and immediately search */
  function loadExample(ex) {
    const state = {
      q:       ex.q       || '',
      fieldId: ex.fieldId || '',
      graph:   ex.graph   ?? '0',
      types:   ex.types   ?? DEFAULT_TYPES,
      filters: ex.filters ?? {},
    };
    setFormState(state);
    setFullDocs([]);
    search(state);
  }

  return {
    formState, updateForm,
    submitted, search,
    rows, total, loading, error,
    fullDocs, fullLoading, fullError,
    solrParams, fetchPage, fetchFull,
    facets,
    loadExample,
  };
}
