import { useEffect, useRef, useState } from 'react';
import { fetchAllResults, buildCsvUrl } from '../utils/solr.js';

// Node colors by type_s  (matches original graph.js)
const GROUP_COLORS = {
  aop:                '#97C2FC',
  key_event:          '#FFC107',
  stressor:           '#8BC34A',
  chemical:           '#F8BBD0',
  assay:              '#CE93D8',
  bio_event_triple:   '#819ea5',
  biological_process: '#0cc6f4',
  biological_action:  '#f312f3',
  biological_object:  '#a9e3f2',
  ke_root:            '#00BCD4',
  ke_leaf:            '#FF5722',
  default:            '#cccccc',
};

function buildGraphData(docs) {
  const nodes = [];
  const edges = [];
  const seenNodes = new Set();
  const validIds = new Set();
  const keUpstream = new Map();
  const keDownstream = new Map();

  docs.forEach(doc => {
    if (doc.type_s !== 'key_event_relationship' && !seenNodes.has(doc.id)) {
      const tooltip = doc.title_t || doc.name_t || doc.short_name_t || '';
      const color = GROUP_COLORS[doc.type_s] || GROUP_COLORS.default;
      nodes.push({
        id: doc.id,
        label: doc.id,
        group: doc.type_s || 'default',
        title: tooltip ? `${doc.id}. ${tooltip}` : doc.id,
        color,
      });
      seenNodes.add(doc.id);
      validIds.add(doc.id);
    }
  });

  docs.forEach(doc => {
    if (doc.type_s === 'key_event_relationship') return;
    const fromId = doc.id;

    (doc.upstream_ss || []).forEach(upId => {
      if (validIds.has(upId) && validIds.has(fromId)) {
        edges.push({ from: upId, to: fromId });
        const upDoc = docs.find(d => d.id === upId);
        if (doc.type_s === 'key_event' && upDoc?.type_s === 'key_event') {
          if (!keUpstream.has(fromId)) keUpstream.set(fromId, new Set());
          keUpstream.get(fromId).add(upId);
        }
      }
    });

    (doc.downstream_ss || []).forEach(downId => {
      if (validIds.has(downId) && validIds.has(fromId)) {
        edges.push({ from: fromId, to: downId });
        const downDoc = docs.find(d => d.id === downId);
        if (doc.type_s === 'key_event' && downDoc?.type_s === 'key_event') {
          if (!keDownstream.has(fromId)) keDownstream.set(fromId, new Set());
          keDownstream.get(fromId).add(downId);
        }
      }
    });
  });

  // Mark KE root/leaf
  nodes.forEach(n => {
    if (n.group === 'key_event') {
      const hasUp = keUpstream.has(n.id) && keUpstream.get(n.id).size > 0;
      const hasDown = keDownstream.has(n.id) && keDownstream.get(n.id).size > 0;
      if (!hasUp) { n.group = 'ke_root'; n.color = GROUP_COLORS.ke_root; }
      else if (!hasDown) { n.group = 'ke_leaf'; n.color = GROUP_COLORS.ke_leaf; }
    }
  });

  // Deduplicate edges
  const edgeSet = new Set();
  const uniqueEdges = edges.filter(e => {
    const key = `${e.from}->${e.to}`;
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    return true;
  });

  return { nodes, edges: uniqueEdges };
}

export default function NetworkGraph({ solrParams, active }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [csvUrl, setCsvUrl] = useState(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!active || !solrParams || loaded) return;

    setLoading(true);
    setError(null);

    fetchAllResults(solrParams)
      .then(async docs => {
        setCsvUrl(buildCsvUrl(docs));
        setNodeCount(docs.length);

        if (!docs.length) {
          setLoading(false);
          return;
        }

        const { nodes, edges } = buildGraphData(docs);

        // Lazy-load vis-network
        const vis = await import('vis-network/standalone');

        const options = {
          edges: {
            smooth: false,
            arrows: { to: { enabled: true, scaleFactor: 0.5 } },
          },
          layout: { improvedLayout: false },
          physics: {
            enabled: docs.length < 5000,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -50,
              centralGravity: 0.01,
              springLength: 100,
              springConstant: 0.08,
            },
            stabilization: { iterations: 100, fit: true, updateInterval: 10 },
          },
        };

        const data = {
          nodes: new vis.DataSet(nodes),
          edges: new vis.DataSet(edges),
        };

        if (containerRef.current) {
          if (networkRef.current) networkRef.current.destroy();
          networkRef.current = new vis.Network(containerRef.current, data, options);
          networkRef.current.once('stabilizationIterationsDone', () => {
            networkRef.current.setOptions({ physics: { enabled: false } });
          });
        }

        setLoaded(true);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [active, solrParams, loaded]);

  // Reset when params change
  useEffect(() => {
    setLoaded(false);
    setCsvUrl(null);
    if (networkRef.current) {
      networkRef.current.destroy();
      networkRef.current = null;
    }
  }, [solrParams]);

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-3">
        <h2 className="h5 mb-0">Download &amp; Network View</h2>
        {csvUrl && (
          <a href={csvUrl} download="aop_search_results.csv" className="btn btn-sm btn-outline-primary">
            <i className="fa fa-download me-1" /> Download CSV
          </a>
        )}
        {nodeCount > 0 && (
          <span className="text-muted small">{nodeCount} documents</span>
        )}
      </div>

      {/* Legend */}
      <div className="d-flex flex-wrap gap-2 mb-2" style={{ fontSize: '0.75rem' }}>
        {Object.entries(GROUP_COLORS).filter(([k]) => k !== 'default').map(([k, color]) => (
          <span key={k} className="d-flex align-items-center gap-1">
            <span style={{ width: 12, height: 12, background: color, borderRadius: '50%', display: 'inline-block', border: '1px solid #ccc' }} />
            {k.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary me-2" />
          Loading graph data…
        </div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {!loading && !error && nodeCount === 0 && loaded && (
        <p className="text-muted">No graph data available for this search.</p>
      )}

      <div
        id="aop-network"
        ref={containerRef}
        style={{ display: loading || nodeCount === 0 ? 'none' : 'block' }}
      />
    </div>
  );
}
