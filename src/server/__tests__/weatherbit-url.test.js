// Guards the two bugs that were in a single line of weatherbit.js and produced no error:
//   lat=${lat}6  appended a stray digit to every latitude
//   ${api}/daily gave `current/daily`, a path Weatherbit does not have
// node-fetch is mocked so the URL can be asserted without a key or a network call.
jest.mock('node-fetch', () => jest.fn())

const fetch = require('node-fetch')
const { weatherGetCity } = require('../API/weatherbit')

// The config is injected rather than read from the environment. weatherGetCity used to
// validate its argument and then build the URL from the module-level constant, which reads
// process.env at import time; testing it meant setting the variable before the require. It
// honours the argument now, so this needs no environment at all.
// The key is one character on purpose. Its value is irrelevant to URL construction, and the
// repo's pre-commit scanner blocks api[_-]?key followed by a quoted literal of 8 or more
// characters, which is the right rule to have even when the match is a test fixture.
const CONFIG = { baseURL: 'https://api.weatherbit.io/v2.0/', apiKey: 'k' }

const CITY = { lat: 40.7128, lng: -74.006, name: 'New York' }
const DATES = { fromDate: '2021-03-15', toDate: '2021-03-17' }

beforeEach(() => {
  fetch.mockReset()
  fetch.mockResolvedValue({ json: async () => ({ data: [] }) })
})

const urls = async () => {
  await weatherGetCity(CONFIG, CITY, DATES)
  return fetch.mock.calls.map((c) => c[0])
}

describe('weatherbit URL construction', () => {
  it('sends the latitude exactly, with no trailing digit', async () => {
    for (const url of await urls()) {
      expect(url).toContain('lat=40.7128&')
      expect(url).not.toContain('lat=40.71286')
    }
  })

  it('uses the documented paths: /current and /forecast/daily', async () => {
    const built = await urls()
    expect(built.some((u) => u.includes('/v2.0/current?'))).toBe(true)
    expect(built.some((u) => u.includes('/v2.0/forecast/daily?'))).toBe(true)
    expect(built.some((u) => u.includes('/current/daily'))).toBe(false)
  })

  it('passes the longitude through and asks for the right number of days', async () => {
    const built = await urls()
    for (const url of built) expect(url).toContain('lon=-74.006')
    expect(built.some((u) => u.includes('&days=2'))).toBe(true)
  })
})
