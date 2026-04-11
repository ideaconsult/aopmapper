import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchFacetSuggestions, fetchDocSuggestions } from '../utils/solr.js';

/**
 * Props:
 *  id, name, label, placeholder
 *  value, onChange
 *  mode: 'facet' | 'doc'
 *  facetField        (mode=facet)
 *  labelField, codeField, fq  (mode=doc)
 *  minChars (default 2)
 */
export default function AutocompleteInput({
  id, name, label, placeholder,
  value, onChange,
  mode = 'facet',
  facetField,
  labelField, codeField, fq,
  minChars = 2,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const fetchSuggestions = useCallback(async (query) => {
    try {
      let results;
      if (mode === 'facet') {
        results = await fetchFacetSuggestions(facetField, query);
      } else {
        results = await fetchDocSuggestions(labelField, codeField, fq, query);
      }
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      setSuggestions([]);
    }
  }, [mode, facetField, labelField, codeField, fq]);

  function handleInput(e) {
    const val = e.target.value;
    onChange(val);
    clearTimeout(debounceRef.current);
    if (val.length >= minChars) {
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  }

  function handleSelect(val) {
    onChange(val);
    setOpen(false);
    setSuggestions([]);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="d-flex flex-column autocomplete-container" ref={containerRef}>
      {label && <label htmlFor={id} className="form-label">{label}</label>}
      <input
        type="text"
        id={id}
        name={name}
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={handleInput}
        autoComplete="off"
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && (
        <div className="autocomplete-dropdown">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="dropdown-item"
              onMouseDown={() => handleSelect(s)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
