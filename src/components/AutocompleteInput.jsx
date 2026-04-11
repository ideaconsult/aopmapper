import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchFacetSuggestions, fetchDocSuggestions } from '../utils/solr.js';

/**
 * Accessible autocomplete input.
 * Keyboard: ArrowDown/Up navigate, Enter selects, Escape closes.
 *
 * Props:
 *   id, name, label, placeholder
 *   value, onChange(string)
 *   mode: 'facet' | 'doc'
 *   facetField              (mode=facet)
 *   labelField, codeField, fq  (mode=doc)
 *   minChars (default 2)
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
  const [focused, setFocused] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = `${id}-listbox`;

  const fetchSuggestions = useCallback(async (query) => {
    try {
      const results = mode === 'facet'
        ? await fetchFacetSuggestions(facetField, query)
        : await fetchDocSuggestions(labelField, codeField, fq, query);
      setSuggestions(results);
      setOpen(results.length > 0);
      setFocused(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, [mode, facetField, labelField, codeField, fq]);

  function handleChange(e) {
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
    setFocused(-1);
  }

  function handleKeyDown(e) {
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocused(f => Math.min(f + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocused(f => Math.max(f - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focused >= 0 && suggestions[focused]) handleSelect(suggestions[focused]);
        break;
      case 'Escape':
        setOpen(false);
        setFocused(-1);
        break;
      default:
        break;
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focused >= 0 && listRef.current) {
      const item = listRef.current.children[focused];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focused]);

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
      {label && (
        <label htmlFor={id} className="form-label">{label}</label>
      )}
      <input
        type="text"
        id={id}
        name={name}
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={focused >= 0 ? `${id}-opt-${focused}` : undefined}
        aria-expanded={open}
        role="combobox"
      />
      {open && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="autocomplete-dropdown list-unstyled mb-0"
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === focused}
              className={`dropdown-item${i === focused ? ' active-suggestion' : ''}`}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setFocused(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
