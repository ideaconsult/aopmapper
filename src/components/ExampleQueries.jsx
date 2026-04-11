import EXAMPLES from '../data/examples.js';

export default function ExampleQueries({ onLoad }) {
  return (
    <div>
      <h2 className="h5 mb-3">Example Queries</h2>
      <p className="text-muted small mb-3">
        Click an example to populate the search form, then click <strong>AOP Wiki Search</strong>.
      </p>
      <div className="d-flex flex-wrap gap-2">
        {Object.entries(EXAMPLES).map(([key, ex]) => (
          <button
            key={key}
            className="btn btn-light example-btn"
            title={ex.title}
            onClick={() => onLoad(ex)}
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  );
}
