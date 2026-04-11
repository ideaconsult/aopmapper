import { useState } from 'react';
import SearchForm from './components/SearchForm.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import NetworkGraph from './components/NetworkGraph.jsx';
import ExampleQueries from './components/ExampleQueries.jsx';
import DebugPanel from './components/DebugPanel.jsx';

const DEFAULT_STATE = {
  q: '',
  fieldId: '',
  graph: '0',
  types: ['aop', 'key_event'],
  filters: {},
  submitted: false,
  _ts: 0,
};

const TABS = [
  { key: 'results',  label: 'Results' },
  { key: 'network',  label: 'View & Download' },
  { key: 'examples', label: 'Example Queries' },
  { key: 'debug',    label: 'Debug Info' },
  { key: 'help',     label: 'Help' },
];

export default function App() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState('results');
  const [solrParams, setSolrParams] = useState(null);

  function update(patch) {
    setState(s => ({ ...s, ...patch }));
  }

  function submit() {
    setState(s => ({ ...s, submitted: true, _ts: Date.now() }));
    setActiveTab('results');
  }

  function loadExample(ex) {
    setState({
      q: ex.q || '',
      fieldId: ex.fieldId || '',
      graph: ex.graph ?? '0',
      types: ex.types ?? ['aop', 'key_event'],
      filters: ex.filters ?? {},
      submitted: false,
      _ts: 0,
    });
    setActiveTab('results');
  }

  function onSetFieldId(id) {
    setState(s => ({ ...s, fieldId: id }));
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* ── Header ── */}
      <header className="aop-header">
        <a href="/aop/" aria-label="AOP Mapper home">
          <img
            src={`${import.meta.env.BASE_URL}assets/img/logo-aopmapper.svg`}
            alt="AOP Mapper logo"
            className="aop-logo"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        </a>
        <h1 className="mb-0">AOP Mapper</h1>
        <span className="text-muted small ms-auto d-none d-md-inline">
          Towards bridging eNanoMapper assays and AOP pathways
        </span>
      </header>

      {/* ── Main ── */}
      <main className="container-fluid py-3 flex-grow-1">
        <SearchForm state={state} onChange={update} onSubmit={submit} />

        {/* Tabs navigation */}
        <ul className="nav nav-tabs aop-tabs mt-3" role="tablist">
          {TABS.map(t => (
            <li key={t.key} className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
                role="tab"
                aria-selected={activeTab === t.key}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Tab content */}
        <div className="tab-content p-3 border border-top-0 rounded-bottom shadow-sm bg-white">

          {/* Results */}
          <div className={`tab-pane ${activeTab === 'results' ? 'show active' : ''}`}>
            <ResultsTable
              searchState={state}
              onSetFieldId={onSetFieldId}
              onParamsReady={setSolrParams}
            />
          </div>

          {/* Network / Download */}
          <div className={`tab-pane ${activeTab === 'network' ? 'show active' : ''}`}>
            <NetworkGraph
              solrParams={solrParams}
              active={activeTab === 'network'}
            />
          </div>

          {/* Example Queries */}
          <div className={`tab-pane ${activeTab === 'examples' ? 'show active' : ''}`}>
            <ExampleQueries onLoad={loadExample} />
          </div>

          {/* Debug */}
          <div className={`tab-pane ${activeTab === 'debug' ? 'show active' : ''}`}>
            <DebugPanel solrParams={solrParams} />
          </div>

          {/* Help */}
          <div className={`tab-pane ${activeTab === 'help' ? 'show active' : ''}`}>
            <h2 className="h5">Help</h2>
            <p>
              <a href="/aop/help.html" target="_blank" rel="noreferrer">
                <i className="fa fa-book me-1" />
                AOP Mapper User Guide
              </a>
            </p>
            <hr />
            <h3 className="h6">Quick reference</h3>
            <ul className="small">
              <li><strong>Free text</strong> – searches across all indexed fields (titles, descriptions, names).</li>
              <li><strong>ID</strong> – exact AOP-Wiki identifier, e.g. <code>AOP144</code>, <code>KE1696</code>, <code>KER1</code>.</li>
              <li><strong>Graph Traversal</strong> – expands results to upstream/downstream neighbours in the AOP network.</li>
              <li><strong>Result types</strong> – filter to AOP, KE, Chemical, Stressor, Assay, Bio process/object/action, Bio event, Taxonomy, KER.</li>
              <li><strong>View &amp; Download</strong> tab – network graph + CSV export of the full result set.</li>
              <li><strong>Example Queries</strong> tab – pre-built queries; click a tag to populate the form, then click Search.</li>
              <li><strong>Debug Info</strong> tab – shows the equivalent Python/requests code for the last query.</li>
            </ul>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="aop-footer">
        <div className="container-fluid d-flex flex-wrap justify-content-between gap-2">
          <small>
            Funded by the European Union's Horizon 2020 under grant agreements{' '}
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
