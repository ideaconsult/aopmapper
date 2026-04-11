import { useEffect, useRef, useState } from 'react';
import { buildCsvUrl, GRAPH_NODE_CAP } from '../utils/solr.js';

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

const LAYOUTS = [
  { key: 'force',        label: 'Force-directed' },
  { key: 'hierarchical', label: 'Hierarchical' },
];

function buildGraphData(docs) {
  const nodes = [], edges = [];
  const seenNodes = new Set(), validIds = new Set();
  const keUp = new Map(), keDown = new Map();

  docs.forEach(doc => {
    if (doc.type_s === 'key_event_relationship' || seenNodes.has(doc.id)) return;
    const tooltip = doc.title_t || doc.name_t || doc.short_name_t || '';
    nodes.push({
      id: doc.id,
      label: doc.id,
      group: doc.type_s || 'default',
      title: tooltip ? `${doc.id}. ${tooltip}` : doc.id,
      color: GROUP_COLORS[doc.type_s] || GROUP_COLORS.default,
      _doc: doc,
    });
    seenNodes.add(doc.id);
    validIds.add(doc.id);
  });

  docs.forEach(doc => {
    if (doc.type_s === 'key_event_relationship') return;
    const fromId = doc.id;
    (doc.upstream_ss || []).forEach(upId => {
      if (!validIds.has(upId) || !validIds.has(fromId)) return;
      edges.push({ from: upId, to: fromId });
      const upDoc = docs.find(d => d.id === upId);
      if (doc.type_s === 'key_event' && upDoc?.type_s === 'key_event') {
        if (!keUp.has(fromId)) keUp.set(fromId, new Set());
        keUp.get(fromId).add(upId);
      }
    });
    (doc.downstream_ss || []).forEach(downId => {
      if (!validIds.has(downId) || !validIds.has(fromId)) return;
      edges.push({ from: fromId, to: downId });
      const downDoc = docs.find(d => d.id === downId);
      if (doc.type_s === 'key_event' && downDoc?.type_s === 'key_event') {
        if (!keDown.has(fromId)) keDown.set(fromId, new Set());
        keDown.get(fromId).add(downId);
      }
    });
  });

  nodes.forEach(n => {
    if (n.group !== 'key_event') return;
    const hasUp = keUp.has(n.id) && keUp.get(n.id).size > 0;
    const hasDown = keDown.has(n.id) && keDown.get(n.id).size > 0;
    if (!hasUp)   { n.group = 'ke_root'; n.color = GROUP_COLORS.ke_root; }
    else if (!hasDown) { n.group = 'ke_leaf'; n.color = GROUP_COLORS.ke_leaf; }
  });

  const edgeSet = new Set();
  const uniqueEdges = edges.filter(e => {
    const k = `${e.from}->${e.to}`;
    if (edgeSet.has(k)) return false;
    edgeSet.add(k);
    return true;
  });

  return { nodes, edges: uniqueEdges };
}

function buildVisOptions(layout, physicsEnabled) {
  const hierarchical = layout === 'hierarchical';
  return {
    edges: {
      smooth: hierarchical ? { type: 'cubicBezier', forceDirection: 'vertical' } : false,
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
    },
    layout: {
      improvedLayout: !hierarchical,
      hierarchical: hierarchical
        ? { enabled: true, direction: 'UD', sortMethod: 'directed', levelSeparation: 120 }
        : { enabled: false },
    },
    physics: {
      enabled: !hierarchical && physicsEnabled,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -50, centralGravity: 0.01,
        springLength: 100, springConstant: 0.08,
      },
      stabilization: { iterations: 100, fit: true, updateInterval: 10 },
    },
  };
}

export default function NetworkGraph({ fullDocs, loading, error, onNodeClick }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [layout, setLayout] = useState('force');
  const [physics, setPhysics] = useState(true);
  const [csvUrl, setCsvUrl] = useState(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!fullDocs?.length || !containerRef.current) return;

    (async () => {
      const vis = await import('vis-network/standalone');
      let docs = fullDocs;
      let wasTruncated = false;

      if (docs.length > GRAPH_NODE_CAP) {
        docs = docs.slice(0, GRAPH_NODE_CAP);
        wasTruncated = true;
      }
      setTruncated(wasTruncated);
      setCsvUrl(buildCsvUrl(fullDocs));

      const { nodes, edges } = buildGraphData(docs);
      const data = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges),
      };

      const physicsEnabled = docs.length < 500;
      setPhysics(physicsEnabled);

      if (networkRef.current) networkRef.current.destroy();
      networkRef.current = new vis.Network(
        containerRef.current,
        data,
        buildVisOptions(layout, physicsEnabled)
      );

      networkRef.current.once('stabilizationIterationsDone', () => {
        networkRef.current.setOptions({ physics: { enabled: false } });
        setPhysics(false);
      });

      // Node click → detail panel
      networkRef.current.on('click', params => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = data.nodes.get(nodeId);
          if (node?._doc && onNodeClick) onNodeClick(node._doc);
        }
      });
    })();
  }, [fullDocs, layout]);

  // Physics toggle (without rebuilding graph)
  function togglePhysics() {
    const next = !physics;
    setPhysics(next);
    networkRef.current?.setOptions({ physics: { enabled: next } });
  }

  // Layout switch triggers full rebuild via the effect above
  function switchLayout(l) {
    setLayout(l);
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary me-2" />
        Loading graph data…
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger py-2 small"><i className="fa fa-exclamation-triangle me-2" />{error}</div>;
  }

  if (!fullDocs?.length) {
    return <p className="text-muted">Run a search first to see the network graph.</p>;
  }

  return (
    <div>
      {/* Controls */}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <h2 className="h5 mb-0">Network View</h2>

        {csvUrl && (
          <a href={csvUrl} download="aop_results.csv" className="btn btn-sm btn-outline-primary">
            <i className="fa fa-download me-1" />Download CSV ({fullDocs.length})
          </a>
        )}

        <div className="btn-group btn-group-sm" role="group" aria-label="Layout">
          {LAYOUTS.map(l => (
            <button
              key={l.key}
              className={`btn ${layout === l.key ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => switchLayout(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="form-check form-switch mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            id="physics-toggle"
            checked={physics}
            onChange={togglePhysics}
          />
          <label className="form-check-label small" htmlFor="physics-toggle">Physics</label>
        </div>
      </div>

      {truncated && (
        <div className="alert alert-warning py-2 small mb-2">
          <i className="fa fa-exclamation-triangle me-1" />
          Graph limited to {GRAPH_NODE_CAP} nodes. Download CSV for the full result set.
        </div>
      )}

      {/* Legend */}
      <div className="d-flex flex-wrap gap-2 mb-2" style={{ fontSize: '0.75rem' }}>
        {Object.entries(GROUP_COLORS).filter(([k]) => k !== 'default').map(([k, color]) => (
          <span key={k} className="d-flex align-items-center gap-1">
            <span style={{ width: 12, height: 12, background: color, borderRadius: '50%', display: 'inline-block', border: '1px solid #ccc' }} />
            {k.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <div id="aop-network" ref={containerRef} />
    </div>
  );
}
