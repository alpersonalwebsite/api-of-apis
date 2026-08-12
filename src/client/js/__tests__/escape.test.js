import { escapeHTML, safeURL } from '../UI/escape'

// markup.js builds HTML from three third-party APIs and assigns it to innerHTML. Nothing
// was escaped and the attributes were single-quoted, so an apostrophe broke out of the
// attribute. These are the exact payloads used to demonstrate that.
describe('escapeHTML', () => {
  it('neutralises the characters that break out of markup', () => {
    expect(escapeHTML('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;')
    expect(escapeHTML("x' onerror='alert(1)")).toBe('x&#39; onerror=&#39;alert(1)')
    expect(escapeHTML('a"b')).toBe('a&quot;b')
    expect(escapeHTML('a&b')).toBe('a&amp;b')
  })

  it('handles a real place name with an apostrophe', () => {
    // Not a hypothetical attack: L'Aquila, Val-d'Or and Martha's Vineyard all broke the
    // alt attribute before.
    expect(escapeHTML("L'Aquila")).toBe('L&#39;Aquila')
  })

  it('escapes the ampersand first, so escaping is not doubled', () => {
    expect(escapeHTML('&lt;')).toBe('&amp;lt;')
  })

  it('returns an empty string for null and undefined rather than printing them', () => {
    expect(escapeHTML(null)).toBe('')
    expect(escapeHTML(undefined)).toBe('')
  })
})

describe('safeURL', () => {
  it('passes http and https through', () => {
    expect(safeURL('https://pixabay.com/get/a.jpg')).toBe('https://pixabay.com/get/a.jpg')
    expect(safeURL('http://pixabay.com/get/a.jpg')).toBe('http://pixabay.com/get/a.jpg')
  })

  it('rejects schemes that execute, which escaping alone would not catch', () => {
    expect(safeURL('javascript:alert(1)')).toBe('')
    expect(safeURL('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(safeURL('vbscript:msgbox(1)')).toBe('')
  })

  it('rejects a scheme hidden behind whitespace or case', () => {
    expect(safeURL('  JavaScript:alert(1)')).toBe('')
  })

  it('escapes quotes in an otherwise valid URL so it cannot end the attribute', () => {
    expect(safeURL("https://x.com/a.jpg' onerror='alert(1)")).not.toContain("'")
  })

  it('allows a relative path', () => {
    expect(safeURL('/images/a.jpg')).toBe('/images/a.jpg')
  })

  it('returns empty for null and undefined', () => {
    expect(safeURL(null)).toBe('')
    expect(safeURL(undefined)).toBe('')
  })
})
