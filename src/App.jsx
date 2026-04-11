import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAopSearch } from './hooks/useAopSearch.js';
import SearchForm from './components/SearchForm.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import NetworkGraph from './components/NetworkGraph.jsx';
import ExampleQueries from './components/ExampleQueries.jsx';
import DebugPanel from './components/DebugPanel.jsx';
import FacetSidebar from './components/FacetSidebar.jsx';
import DetailPanel from './components/DetailPanel.jsx';

import { GRAPH_NODE_CAP } from './utils/solr.js';

const TABS = [
  { key: 'results',  label: 'Results' },
  { key: 'network',  label: 'View & Download' },
  { key: 'examples', label: 'Example Queries' },
  { key: 'debug',    label: 'Debug Info' },
  { key: 'help',     label: 'Help' },
];

function AopMapper() {
  const {
    formState, updateForm,
    submitted, search,
    rows, total, loading, error,
    fullDocs, fullLoading, fullError,
    solrParams, fetchPage, fetchFull,
    facets, loadExample,
  } = useAopSearch();

  const [activeTab, setActiveTab]     = useState('results');
  const [page, setPage]               = useState(0);
  const [pageSize, setPageSize]       = useState(10);
  const [sortField, setSortField]     = useState('title_t');
  const [sortDir, setSortDir]         = useState('asc');
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Fetch page whenever params or pagination/sort changes
  useEffect(() => {
    if (!solrParams) return;
    fetchPage(solrParams, page * pageSize, pageSize, sortField, sortDir);
  }, [solrParams, page, pageSize, sortField, sortDir, fetchPage]);

  // Reset page when new search fires
  useEffect(() => {
    setPage(0);
  }, [solrParams]);

  // Fetch full docs when graph tab becomes active
  useEffect(() => {
    if (activeTab === 'network' && solrParams && fullDocs.length === 0) {
      fetchFull(solrParams);
    }
  }, [activeTab, solrParams, fullDocs.length, fetchFull]);

  function handleSort(key) {
    if (sortField === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortDir('asc');
    }
    setPage(0);
  }

  function handleSetFieldId(id) {
    updateForm({ fieldId: id });
  }

  function handleFacetToggle(type) {
    const types = formState.types;
    const next = types.includes(type) ? types.filter(t => t !== type) : [...types, type];
    updateForm({ types: next });
  }

  function handleNodeClick(doc) {
    setSelectedDoc(doc);
  }

  // Search by ID from DetailPanel link
  function handleSearchId(id) {
    updateForm({ fieldId: id });
    search({ ...formState, fieldId: id });
    setActiveTab('results');
    setSelectedDoc(null);
  }

  const isSorted = sortField !== null && sortField !== 'score';

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Header */}
      <header className="aop-header">
        <a href="/aop/" aria-label="AOP Mapper home">
          <img
            src={`${import.meta.env.BASE_URL}assets/img/logo-aopmapper.svg`}
            alt="AOP Mapper"
            className="aop-logo"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        </a>
        <h1 className="mb-0">AOP Mapper</h1>
        <span className="text-muted small ms-auto d-none d-md-inline">
          Towards bridging eNanoMapper assays and AOP pathways
        </span>
      </header>

      {/* Search form */}
      <div className="container-fluid py-2">
        <SearchForm
          state={formState}
          onChange={updateForm}
          onSubmit={() => search()}
        />
      </div>

      {/* Tabs */}
      <div className="container-fluid flex-grow-1">
        <ul className="nav nav-tabs aop-tabs" role="tablist">
          {TABS.map(t => (
            <li key={t.key} className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
                role="tab"
                aria-selected={activeTab === t.key}
              >
                {t.label}
                {t.key === 'results' && total > 0 && (
                  <span className="badge bg-secondary ms-1" style={{ fontSize: '0.7em' }}>
                    {total > 9999 ? '9999+' : total}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="tab-content border border-top-0 rounded-bottom shadow-sm bg-white">

          {/* Results tab */}
          <div className={`tab-pane p-3 ${activeTab === 'results' ? 'show active' : ''}`}>
            {!submitted ? (
              <div className="text-center text-muted py-5">
                <i className="fa fa-search fa-2x mb-2 d-block" />
                Enter search criteria above and click <strong>AOP Wiki Search</strong>
              </div>
            ) : (
              <div className="d-flex gap-3">
                {/* Facet sidebar */}
                {Object.keys(facets).length > 0 && (
                  <FacetSidebar
                    facets={facets}
                    activeTypes={formState.types}
                    onToggle={handleFacetToggle}
                  />
                )}

                {/* Main table + detail panel */}
                <div className="flex-grow-1 min-w-0">
                  <div className={`d-flex gap-3 ${selectedDoc ? '' : ''}`}>
                    <div className="flex-grow-1 min-w-0">
                      <ResultsTable
                        rows={rows}
                        total={total}
                        loading={loading}
                        error={error}
                        page={page}
                        setPage={setPage}
                        pageSize={pageSize}
                        setPageSize={setPageSize}
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                        onSetFieldId={handleSetFieldId}
                        onRowClick={setSelectedDoc}
                        selectedId={selectedDoc?.id}
                        isSorted={isSorted}
                      />
                    </div>

                    {selectedDoc && (
                      <div style={{ width: '380px', flexShrink: 0 }}>
                        <DetailPanel
                          doc={selectedDoc}
                          onClose={() => setSelectedDoc(null)}
                          onSearchId={handleSearchId}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Network tab */}
          <div className={`tab-pane p-3 ${activeTab === 'network' ? 'show active' : ''}`}>
            <NetworkGraph
              fullDocs={fullDocs}
              loading={fullLoading}
              error={fullError}
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Examples tab */}
          <div className={`tab-pane p-3 ${activeTab === 'examples' ? 'show active' : ''}`}>
            <ExampleQueries onLoad={ex => { loadExample(ex); setActiveTab('results'); }} />
          </div>

          {/* Debug tab */}
          <div className={`tab-pane p-3 ${activeTab === 'debug' ? 'show active' : ''}`}>
            <DebugPanel solrParams={solrParams} />
          </div>

          {/* Help tab */}
          <div className={`tab-pane p-3 ${activeTab === 'help' ? 'show active' : ''}`}>
            <h2 className="h5">Help</h2>
            <p>
              <a href="/aop/help.html" target="_blank" rel="noreferrer">
                <i className="fa fa-book me-1" />AOP Mapper User Guide
              </a>
            </p>
            <hr />
            <h3 className="h6">Quick reference</h3>
            <ul className="small">
              <li><strong>Free text</strong> – searches all indexed fields.</li>
              <li><strong>ID</strong> – exact AOP-Wiki identifier, e.g. <code>AOP144</code>, <code>KE1696</code>, <code>KER1</code>.</li>
              <li><strong>Graph Traversal</strong> – expands results to upstream/downstream neighbours.</li>
              <li><strong>Result types</strong> – filter to AOP, KE, Chemical, Stressor, Assay, Bio process/object/action, Bio event, Taxonomy, KER.</li>
              <li><strong>Facet sidebar</strong> – click a type count to toggle that type filter.</li>
              <li><strong>Table rows</strong> – click a row to open the detail panel.</li>
              <li><strong>View &amp; Download</strong> – network graph (force-directed or hierarchical) + CSV export. Capped at {GRAPH_NODE_CAP} nodes in the graph.</li>
              <li><strong>URL</strong> – search state is encoded in the URL; bookmark or share any query.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="aop-footer mt-3">
        <div className="container-fluid d-flex flex-wrap justify-content-between gap-2">
          <small>
            Funded by the European Union's Horizon 2020 under{' '}
            <a href="https://www.harmless-project.eu/" target="_blank" rel="noreferrer">953183 HARMLESS</a>
            {' '}and{' '}
            <a href="https://polyrisk.science/" target="_blank" rel="noreferrer">964766 POLYRISK</a>
          </small>
          <small>
            <a href="mailto:support@ideaconsult.net">support@ideaconsult.net</a>
          </small>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/aop">
      <Routes>
        <Route path="/*" element={<AopMapper />} />
      </Routes>
    </BrowserRouter>
  );
}
