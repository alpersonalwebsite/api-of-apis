/**
 * @jest-environment jsdom
 */
import { generateMarkup } from '../UI/markup'

// escape.test.js proves the helpers work. This file proves they are actually APPLIED at
// every sink in markup.js, which is a separate question: a reviewer removed escapeHTML from
// the <h2> and all 51 tests still passed, because nothing exercised markup.js itself.
//
// The assertions deliberately inspect the parsed DOM rather than the HTML string. If a value
// escapes its attribute, the browser creates a real `onerror` attribute or a real element,
// and querying for those catches it however the payload was shaped.

// Two payloads, because the context decides what can escape it. A single-quote payload
// cannot break out of a double-quoted attribute, so testing with one produces a test that
// passes whether or not the escaping is there. Measured: with only a single-quote payload,
// removing escapeHTML from the <h2> and from three other sinks left all tests green.
//
//   ATTR  breaks a double-quoted attribute, which is what markup.js now emits
//   TEXT  creates a real element when interpolated into element content
const ATTR = 'x" onerror="window.__pwned = true'
const TEXT = '<img src=x onerror="window.__pwned = true">'

const element = { type: 'div', id: 'results', classes: ['travel'] }

const data = (overrides = {}) => ({
  city: { name: 'London', lat: '51.5', lng: '-0.1' },
  photos: [{ previewURL: 'https://pixabay.com/get/a.jpg', tags: 'city' }],
  weather: {
    days: { days: 2 },
    currentMin: { icon: 'c02d', description: 'Scattered clouds' },
    forecastMin: [{ date: '2021-03-15', temp: 10, weather: { icon: 'c04d', description: 'Overcast' } }]
  },
  ...overrides
})

const noHandlers = (node) => {
  // No element anywhere may carry an inline event handler or be a script.
  expect(node.querySelectorAll('script').length).toBe(0)
  for (const el of node.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      expect(attr.name.startsWith('on')).toBe(false)
    }
  }
}

describe('generateMarkup escapes every sink', () => {
  afterEach(() => {
    delete window.__pwned
  })

  // The city name reaches an element's text (the <h2>) AND two alt attributes, so it is
  // tested with both payload shapes.
  it.each([
    ['attribute-breaking', ATTR],
    ['element-creating', TEXT]
  ])('escapes the city name against a %s payload', (_label, payload) => {
    const node = generateMarkup(element, data({ city: { name: payload, lat: '1', lng: '2' } }))
    noHandlers(node)
    expect(node.textContent).toContain(payload)
    expect(window.__pwned).toBeUndefined()
  })

  it('escapes a photo previewURL', () => {
    const node = generateMarkup(element, data({ photos: [{ previewURL: ATTR, tags: 't' }] }))
    noHandlers(node)
    expect(window.__pwned).toBeUndefined()
  })

  it('rejects a javascript: previewURL rather than escaping it', () => {
    const node = generateMarkup(element, data({ photos: [{ previewURL: 'javascript:alert(1)', tags: 't' }] }))
    const img = node.querySelector('.travel-image img')
    if (img) expect(img.getAttribute('src')).toBe('')
    noHandlers(node)
  })

  it.each([
    ['attribute-breaking', ATTR],
    ['element-creating', TEXT]
  ])('escapes the weather description against a %s payload', (_label, payload) => {
    const node = generateMarkup(
      element,
      data({
        weather: { ...data().weather, currentMin: { icon: 'c02d', description: payload } }
      })
    )
    noHandlers(node)
    expect(node.textContent).toContain(payload)
    expect(window.__pwned).toBeUndefined()
  })

  it('escapes the forecast description and drops a hostile icon code', () => {
    const node = generateMarkup(
      element,
      data({
        weather: {
          ...data().weather,
          forecastMin: [{ date: '2021-03-15', temp: 10, weather: { icon: ATTR, description: ATTR } }]
        }
      })
    )
    noHandlers(node)
    // The icon is allowlisted, not escaped, so a hostile code yields no img at all.
    expect(node.querySelectorAll('.travel-forecast img').length).toBe(0)
  })

  // The warning is interpolated into element content, so TEXT is the payload that matters.
  it.each([
    ['attribute-breaking', ATTR],
    ['element-creating', TEXT]
  ])('escapes the days warning against a %s payload', (_label, payload) => {
    const node = generateMarkup(
      element,
      data({
        weather: { ...data().weather, days: { days: 20, warning: payload } }
      })
    )
    noHandlers(node)
    expect(node.textContent).toContain(payload)
    expect(window.__pwned).toBeUndefined()
  })

  it('still renders the good case correctly', () => {
    const node = generateMarkup(element, data())
    expect(node.querySelector('h2').textContent).toBe('London')
    expect(node.querySelector('.travel-image img').getAttribute('src')).toBe('https://pixabay.com/get/a.jpg')
    expect(node.querySelectorAll('.travel-forecast img').length).toBe(1)
    noHandlers(node)
  })

  it('renders an apostrophe place name intact, in text and in alt', () => {
    const node = generateMarkup(element, data({ city: { name: "L'Aquila", lat: '1', lng: '2' } }))
    expect(node.querySelector('h2').textContent).toBe("L'Aquila")
    expect(node.querySelector('.travel-image img').getAttribute('alt')).toBe("L'Aquila")
    noHandlers(node)
  })

  it('survives an empty photos array, which pixabay returns for obscure queries', () => {
    const node = generateMarkup(element, data({ photos: [] }))
    expect(node.querySelectorAll('.travel-image img').length).toBe(0)
    noHandlers(node)
  })
})
