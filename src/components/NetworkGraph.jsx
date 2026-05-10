import { useEffect, useRef, useState } from 'react';
import { buildCsvUrl, GRAPH_NODE_CAP } from '../utils/solr.js';

// ── Colour palette ────────────────────────────────────────────────────────────
const GROUP_COLORS = {
  aop:                    '#97C2FC',
  key_event:              '#FFC107',
  ke_mie:                 '#00BCD4',   // Molecular Initiating Event
  ke_ao:                  '#FF5722',   // Adverse Outcome
  key_event_relationship: '#b0b8c1',
  stressor:               '#8BC34A',
  chemical:               '#F8BBD0',
  assay:                  '#CE93D8',
  bio_event_triple:       '#819ea5',
  biological_process:     '#0cc6f4',
  biological_action:      '#f312f3',
  biological_object:      '#a9e3f2',
  default:                '#cccccc',
};

const GROUP_LABELS = {
  aop:                    'AOP',
  key_event:              'Key Event',
  ke_mie:                 'Key Event (MIE)',
  ke_ao:                  'Key Event (AO)',
  key_event_relationship: 'Key Event Relationship',
  stressor:               'Stressor',
  chemical:               'Chemical',
  assay:                  'Assay',
  bio_event_triple:       'Bio Event Triple',
  biological_process:     'Biological Process',
  biological_action:      'Biological Action',
  biological_object:      'Biological Object',
};

const LAYOUTS = [
  { key: 'force',        label: 'Force-directed' },
  { key: 'hierarchical', label: 'Hierarchical' },
];

function getNodeShape(type) {
  switch (type) {
    case 'key_event':
    case 'ke_mie':
    case 'ke_ao':
      return { shape: 'ellipse' };
    case 'key_event_relationship':
      return { shape: 'box', margin: 4, shapeProperties: { borderRadius: 4 } };
    case 'bio_event_triple':
      return { shape: 'box', margin: 10, shapeProperties: { borderRadius: 20 } };
    case 'chemical':
      return { shape: 'diamond' };
    case 'aop':
      return { shape: 'box', margin: 5, shapeProperties: { borderRadius: 10 } };
    case 'assay':
      return { shape: 'box', margin: 5, shapeProperties: { borderRadius: 2 } };
    default:
      return { shape: 'ellipse' };
  }
}

function buildGraphData(docs, showKer) {
  const nodes     = [];
  const edges     = [];
  const seenNodes = new Set();
  const validIds  = new Set();

  // ── Pass 1: identify MIE and AO KE ids ──────────────────────────────────
  //
  // Two sources:
  //
  // A) AOP documents:
  //    - molecular_initiating_event_ss  → list of KE ids that are MIEs of this AOP
  //    - adverse_outcome_ss             → list of KE ids that are AOs of this AOP
  //
  // B) KE documents (populated by pydantic2solr from ke_links):
  //    - MIE_ss non-empty              → this KE IS a MIE in some AOP
  //    - adverse_outcome_ss non-empty  → this KE IS an AO in some AOP
  //
  // MIE_ss is now in FL so it is returned for KE docs.
  // molecular_initiating_event_ss is in FL so it is returned for AOP docs.

  const mieIds = new Set();
  const aoIds  = new Set();

  docs.forEach(doc => {
    if (doc.type_s === 'aop') {
      // AOP doc: molecular_initiating_event_ss lists the MIE KE ids
      (doc.molecular_initiating_event_ss || []).forEach(id => mieIds.add(id));
      // AOP doc: adverse_outcome_ss lists the AO KE ids
      (doc.adverse_outcome_ss || []).forEach(id => aoIds.add(id));
    }
    if (doc.type_s === 'key_event') {
      // KE doc: MIE_ss is non-empty when this KE is a MIE in ≥1 AOP
      if (doc.MIE_ss?.length)             mieIds.add(doc.id);
      // KE doc: adverse_outcome_ss is non-empty when this KE is an AO in ≥1 AOP
      if (doc.adverse_outcome_ss?.length) aoIds.add(doc.id);
    }
  });

  // ── Pass 2: build nodes ──────────────────────────────────────────────────
  docs.forEach(doc => {
    if (doc.type_s === 'key_event_relationship' && !showKer) return;
    if (seenNodes.has(doc.id)) return;

    let group = doc.type_s || 'default';
    let color = GROUP_COLORS[group] || GROUP_COLORS.default;

    if (group === 'key_event') {
      if (mieIds.has(doc.id)) {
        group = 'ke_mie';
        color = GROUP_COLORS.ke_mie;
      } else if (aoIds.has(doc.id)) {
        group = 'ke_ao';
        color = GROUP_COLORS.ke_ao;
      }
    }

    const tooltip = doc.title_t || doc.name_t || doc.short_name_t || '';
    nodes.push({
      id:    doc.id,
      label: doc.id,
      group,
      title: tooltip ? `${doc.id}. ${tooltip}` : doc.id,
      color,
      ...getNodeShape(group),
      _doc: doc,
    });
    seenNodes.add(doc.id);
    validIds.add(doc.id);
  });

  // ── Pass 3: build edges ──────────────────────────────────────────────────
  docs.forEach(doc => {
    if (doc.type_s === 'key_event_relationship' && !showKer) return;

    const fromId = doc.id;

    if (doc.type_s === 'key_event_relationship' && showKer) {
      (doc.upstream_ss || []).forEach(upId => {
        if (validIds.has(upId) && validIds.has(fromId))
          edges.push({ from: upId, to: fromId });
      });
      (doc.downstream_ss || []).forEach(downId => {
        if (validIds.has(downId) && validIds.has(fromId))
          edges.push({ from: fromId, to: downId });
      });
      return;
    }

    (doc.upstream_ss || []).forEach(upId => {
      if (!validIds.has(upId) || !validIds.has(fromId)) return;
      const upDoc = docs.find(d => d.id === upId);
      if (upDoc?.type_s === 'key_event_relationship' && !showKer) return;
      edges.push({ from: upId, to: fromId });
    });

    (doc.downstream_ss || []).forEach(downId => {
      if (!validIds.has(downId) || !validIds.has(fromId)) return;
      const downDoc = docs.find(d => d.id === downId);
      if (downDoc?.type_s === 'key_event_relationship' && !showKer) return;
      edges.push({ from: fromId, to: downId });
    });
  });

  // Deduplicate edges
  const edgeSet     = new Set();
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
  const networkRef   = useRef(null);
  const [layout,    setLayout]    = useState('force');
  const [physics,   setPhysics]   = useState(true);
  const [showKer,   setShowKer]   = useState(false);
  const [csvUrl,    setCsvUrl]    = useState(null);
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

      const { nodes, edges } = buildGraphData(docs, showKer);
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

      networkRef.current.on('click', params => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node   = data.nodes.get(nodeId);
          if (node?._doc && onNodeClick) onNodeClick(node._doc);
        }
      });
    })();
  }, [fullDocs, layout, showKer]);

  function togglePhysics() {
    const next = !physics;
    setPhysics(next);
    networkRef.current?.setOptions({ physics: { enabled: next } });
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
    return (
      <div className="alert alert-danger py-2 small">
        <i className="fa fa-exclamation-triangle me-2" />{error}
      </div>
    );
  }
  if (!fullDocs?.length) {
    return <p className="text-muted">Run a search first to see the network graph.</p>;
  }

  const presentTypes = new Set(fullDocs.map(d => d.type_s));
  if (presentTypes.has('key_event')) {
    presentTypes.add('ke_mie');
    presentTypes.add('ke_ao');
  }
  const legendEntries = Object.entries(GROUP_LABELS).filter(([k]) => presentTypes.has(k));

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <h2 className="h5 mb-0">Network View</h2>

        {csvUrl && (
          <a href={csvUrl} download="aop_results.csv" className="btn btn-sm btn-outline-primary">
            <i className="fa fa-download me-1" />Download CSV ({fullDocs.length})
          </a>
        )}

        <div className="btn-group btn-group-sm" role="group">
          {LAYOUTS.map(l => (
            <button
              key={l.key}
              className={`btn ${layout === l.key ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setLayout(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="form-check form-switch mb-0">
          <input className="form-check-input" type="checkbox" id="physics-toggle"
            checked={physics} onChange={togglePhysics} />
          <label className="form-check-label small" htmlFor="physics-toggle">Physics</label>
        </div>

        <div className="form-check form-switch mb-0">
          <input className="form-check-input" type="checkbox" id="ker-toggle"
            checked={showKer} onChange={() => setShowKer(v => !v)} />
          <label className="form-check-label small" htmlFor="ker-toggle">Show KERs</label>
        </div>
      </div>

      {truncated && (
        <div className="alert alert-warning py-2 small mb-2">
          <i className="fa fa-exclamation-triangle me-1" />
          Graph limited to {GRAPH_NODE_CAP} nodes. Download CSV for the full result set.
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mb-2" style={{ fontSize: '0.75rem' }}>
        {legendEntries.map(([k, label]) => (
          <span key={k} className="d-flex align-items-center gap-1">
            <span style={{
              width: 12, height: 12,
              background: GROUP_COLORS[k],
              borderRadius: k === 'key_event_relationship' ? '2px' : '50%',
              display: 'inline-block',
              border: '1px solid #ccc',
            }} />
            {label}
          </span>
        ))}
      </div>

      <div id="aop-network" ref={containerRef} />
    </div>
  );
}
