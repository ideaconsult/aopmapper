import { TYPE_LABELS, typeBadgeClass } from '../utils/aopLinks.js';

/**
 * Shows Solr facet counts per type_s.
 * Clicking a count toggles that type in the active filter.
 */
export default function FacetSidebar({ facets, activeTypes, onToggle }) {
  if (!facets || Object.keys(facets).length === 0) return null;

  const total = Object.values(facets).reduce((a, b) => a + b, 0);

  return (
    <div className="facet-sidebar">
      <div className="facet-title">Filter by type</div>
      <ul className="list-unstyled mb-0">
        {Object.entries(facets)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => {
            const label = TYPE_LABELS[type] || type;
            const active = activeTypes.includes(type);
            const badgeCls = typeBadgeClass(type);
            return (
              <li key={type}>
                <button
                  className={`facet-item ${active ? 'facet-item--active' : ''}`}
                  onClick={() => onToggle(type)}
                  title={`${active ? 'Remove' : 'Add'} filter: ${label}`}
                >
                  <span className={`type-badge ${badgeCls}`}>{label}</span>
                  <span className="facet-count">{count.toLocaleString()}</span>
                </button>
              </li>
            );
          })}
        <li className="facet-total">
          <span className="text-muted small">{total.toLocaleString()} total</span>
        </li>
      </ul>
    </div>
  );
}
