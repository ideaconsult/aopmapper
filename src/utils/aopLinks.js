/**
 * Return AOP-Wiki URL for a given id string, or null if unknown prefix.
 */
export function aopWikiUrl(id) {
  if (typeof id !== 'string') return null;
  const m = id.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  const [, prefix, num] = m;
  switch (prefix) {
    case 'AOP': return `https://aopwiki.org/aops/${num}`;
    case 'KE':  return `https://aopwiki.org/events/${num}`;
    case 'KER': return `https://aopwiki.org/relationships/${num}`;
    case 'S':   return `https://aopwiki.org/stressors/${num}`;
    default:    return null;
  }
}

/**
 * CSS class suffix for type_s value → e.g. 'aop', 'key_event', …
 */
export function typeBadgeClass(type) {
  const known = [
    'aop', 'key_event', 'chemical', 'stressor', 'assay',
    'biological_process', 'biological_object', 'biological_action',
    'bio_event_triple', 'taxonomy', 'key_event_relationship',
  ];
  return known.includes(type) ? `type-${type}` : 'type-default';
}

/**
 * Human-readable label for type_s
 */
export const TYPE_LABELS = {
  aop: 'AOP',
  key_event: 'KE',
  chemical: 'Chemical',
  stressor: 'Stressor',
  assay: 'Assay',
  biological_process: 'Bio process',
  biological_object: 'Bio object',
  biological_action: 'Bio action',
  bio_event_triple: 'Bio event',
  taxonomy: 'Taxonomy',
  key_event_relationship: 'KER',
};

export const ALL_TYPES = Object.keys(TYPE_LABELS);
