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

  // Both icon sinks, not just the forecast one. markupWeather and markupWeatherForecast each
  // build src="https://.../icons/${icon}.png" with the icon allowlisted rather than escaped,
  // so the allowlist is that value's only protection. A reviewer removed the current-weather
  // allowlist alone and all 63 tests stayed green, because this fixture only ever fed the
  // hostile value to forecastMin[].weather.icon while currentMin.icon stayed 'c02d'. The DOM
  // probe on that poison showed a real IMG[onerror] attribute being created.
  it('drops a hostile icon code in both the current and forecast sinks', () => {
    const node = generateMarkup(
      element,
      data({
        weather: {
          days: { days: 2 },
          currentMin: { icon: ATTR, description: 'Scattered clouds' },
          forecastMin: [{ date: '2021-03-15', temp: 10, weather: { icon: ATTR, description: ATTR } }]
        }
      })
    )
    noHandlers(node)
    // Allowlisted, not escaped, so a hostile code yields no img at all in either place.
    expect(node.querySelectorAll('.travel-forecast img').length).toBe(0)
    expect(node.querySelectorAll('.container img').length).toBe(0)
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

  // A VALID icon with a hostile description, which is the only way to reach the alt beside it.
  // When the icon is hostile the allowlist drops the whole <img>, so the alt never renders and
  // removing its escaping is invisible: measured, that poison left all 63 tests green. A guard
  // that short-circuits hides every guard downstream of it.
  it('escapes the alt beside a valid icon, in both weather sinks', () => {
    const node = generateMarkup(
      element,
      data({
        city: { name: ATTR, lat: '1', lng: '2' },
        weather: {
          days: { days: 2 },
          currentMin: { icon: 'c02d', description: ATTR },
          forecastMin: [{ date: '2021-03-15', temp: 10, weather: { icon: 'c04d', description: ATTR } }]
        }
      })
    )
    // Both imgs must exist, or this test never reaches the alt attributes at all.
    expect(node.querySelectorAll('.container img').length).toBe(1)
    expect(node.querySelectorAll('.travel-forecast img').length).toBe(1)
    noHandlers(node)
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

  // The route's own documented fallback for a weatherbit response with no current data is
  // currentMin: null, and route.test.js's happy-path fixture returns exactly that. A default
  // parameter only fires for undefined, so null reached data.icon and threw
  // TypeError: Cannot read properties of null.
  it.each([
    ['currentMin null', { days: { days: 2 }, currentMin: null, forecastMin: [] }],
    ['weather null', null],
    ['forecastMin null', { days: { days: 2 }, currentMin: { icon: 'c02d' }, forecastMin: null }],
    ['days null', { days: null, currentMin: { icon: 'c02d' }, forecastMin: [] }]
  ])('renders with %s instead of throwing', (_label, weather) => {
    expect(() => generateMarkup(element, data({ weather }))).not.toThrow()
  })

  // generateMarkup itself, not just its sections. The `|| {}` on the whole payload guards the
  // case where the fetch resolved to null or the response had no body; nothing exercised it,
  // so reverting it to a bare `const safe = data` left all 80 tests green.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'nope'],
    ['a number', 0]
  ])('renders with a payload of %s instead of throwing', (_label, payload) => {
    expect(() => generateMarkup(element, payload)).not.toThrow()
  })

  it('renders with a null city and null photos', () => {
    expect(() => generateMarkup(element, data({ city: null, photos: null }))).not.toThrow()
  })

  // new Date('2021-03-15') is UTC midnight, so the local getters report 14 March anywhere
  // west of UTC. The date shown must not depend on the reader's time zone.
  it('shows the forecast date in UTC, not the local shift', () => {
    const node = generateMarkup(
      element,
      data({
        weather: {
          days: { days: 1 },
          currentMin: { icon: 'c02d', description: 'ok' },
          forecastMin: [{ date: '2021-03-15', temp: 10, weather: { icon: 'c04d', description: 'ok' } }]
        }
      })
    )
    expect(node.querySelector('.travel-forecast .flex-item div').textContent).toBe('3/15')
  })

  it('survives an empty photos array, which pixabay returns for obscure queries', () => {
    const node = generateMarkup(element, data({ photos: [] }))
    expect(node.querySelectorAll('.travel-image img').length).toBe(0)
    noHandlers(node)
  })
})

// Guards the guard. The timezone test above can only fail in a non-UTC zone, so the pin in
// jest.config.js is load-bearing. Without this, removing the pin would silently disable that
// test rather than break anything, which is the same failure shape as a test whose payload
// cannot escape its context.
describe('forecast entries with unusable dates', () => {
  // The server parser filters null and primitive ENTRIES but does not look inside a valid
  // object, so an entry with a missing or unparseable datetime reached this loop and rendered
  // NaN/NaN.
  it.each([
    ['a missing date', undefined],
    ['an empty date', ''],
    ['an unparseable date', 'not-a-date'],
    ['a null date', null],
    ['a numeric zero date', 0],
    ['a numeric timestamp', 1615766400000]
  ])('skips an entry with %s rather than rendering NaN', (_label, date) => {
    const node = generateMarkup(
      element,
      data({
        weather: {
          days: { days: 1 },
          currentMin: { icon: 'c02d', description: 'ok' },
          forecastMin: [{ date, temp: 9, weather: { icon: 'c01d', description: 'ok' } }]
        }
      })
    )
    expect(node.textContent).not.toContain('NaN')
    expect(node.querySelectorAll('.travel-forecast .flex-item').length).toBe(0)
  })

  it('keeps the valid entries alongside an invalid one', () => {
    const node = generateMarkup(
      element,
      data({
        weather: {
          days: { days: 2 },
          currentMin: { icon: 'c02d', description: 'ok' },
          forecastMin: [
            { date: 'nonsense', temp: 1, weather: { icon: 'c01d', description: 'a' } },
            { date: '2021-03-16', temp: 2, weather: { icon: 'c01d', description: 'b' } }
          ]
        }
      })
    )
    expect(node.textContent).not.toContain('NaN')
    expect(node.querySelectorAll('.travel-forecast .flex-item').length).toBe(1)
    expect(node.textContent).toContain('3/16')
  })
})

describe('the test environment itself', () => {
  it('runs in a non-UTC timezone, or the UTC date test cannot fail', () => {
    const offset = new Date('2021-03-15T00:00:00Z').getTimezoneOffset()
    expect(offset).not.toBe(0)
  })
})
