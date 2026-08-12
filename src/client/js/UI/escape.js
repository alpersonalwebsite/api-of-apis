// Values interpolated into markup here come from three third-party APIs (geonames,
// weatherbit, pixabay) and land in `innerHTML`. None of it was escaped, and the
// attributes were single-quoted, so a value containing an apostrophe broke out of the
// attribute. That is not hypothetical for place names: L'Aquila, Val-d'Or and Martha's
// Vineyard all do it, and a `previewURL` of  x' onerror='alert(1)  yields a live
// onerror handler.
//
// So: escape everything interpolated, and use double quotes for attributes.

const escapeHTML = (value) => {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Escaping alone does not make a URL safe to put in src: `javascript:alert(1)` contains
// no character that escaping touches. Only http(s) is allowed through, and anything else
// becomes an empty string so the image simply fails to load.
const safeURL = (value) => {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return ''
    return escapeHTML(parsed.href)
  } catch (err) {
    // Not an absolute URL. Relative paths are fine, but reject anything carrying a
    // scheme-ish prefix or a quote that could terminate the attribute.
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return ''
    return escapeHTML(raw)
  }
}

export { escapeHTML, safeURL }
