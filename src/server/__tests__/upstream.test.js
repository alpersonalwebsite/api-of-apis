// The point of this file is that it uses the REAL API modules with only node-fetch mocked.
// route.test.js mocks the modules themselves, which is fine for routing logic but cannot show
// what happens on a genuine upstream failure: the modules used to catch and return the Error,
// so the route saw data rather than a rejection and answered 404 or 200. Measured before the
// fix: a geonames outage returned 404 "We do not have that city in our records".
jest.mock('node-fetch', () => jest.fn())

// Set before the require: the API modules read their keys into module-level constants at
// import time. One character, because the value is irrelevant here and the repo's pre-commit
// scanner blocks api[_-]?key followed by a quoted literal of 8 or more characters.
process.env.GEONAMES_API_KEY = 'k'
process.env.WEATHERBIT_API_KEY = 'k'
process.env.PIXABAY_API_KEY = 'k'

const fetch = require('node-fetch')
const request = require('supertest')
const app = require('../app').default

const body = { city: 'London', dates: { fromDate: '2021-03-15', toDate: '2021-03-17' } }

beforeEach(() => fetch.mockReset())

describe('a real upstream failure reaches the error middleware', () => {
  it('answers 502, not a false 404, when the network is down', async () => {
    fetch.mockRejectedValue(new Error('ENOTFOUND api.geonames.org'))
    const res = await request(app).post('/api/travels').send(body)
    expect(res.status).toBe(502)
    expect(res.body.error.type).toBe('upstream')
  })

  it('answers 502 when a response body is not JSON', async () => {
    fetch.mockResolvedValue({
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0')
      }
    })
    const res = await request(app).post('/api/travels').send(body)
    expect(res.status).toBe(502)
  })

  it('still answers 404 for a city the geocoder genuinely does not know', async () => {
    // The distinction that matters: an empty result is not a failure.
    fetch.mockResolvedValue({ json: async () => ({ totalResultsCount: 0 }) })
    const res = await request(app).post('/api/travels').send(body)
    expect(res.status).toBe(404)
    expect(res.body.error.type).toBe('city')
  })

  it('answers 502 when a key is missing, rather than a misleading 404', async () => {
    // A side effect of the re-throw worth having: geoGetCityInfo validates that its config
    // carries an apiKey and throws when it does not. That used to be swallowed and become
    // "We do not have that city in our records", so a misconfigured deployment looked like
    // every city being unknown. The module is re-required with no key to show it.
    jest.resetModules()
    delete process.env.GEONAMES_API_KEY
    const freshApp = require('../app').default
    const freshFetch = require('node-fetch')
    freshFetch.mockResolvedValue({ json: async () => ({ totalResultsCount: 1 }) })
    const res = await request(freshApp).post('/api/travels').send(body)
    expect(res.status).toBe(502)
    process.env.GEONAMES_API_KEY = 'k'
  })
})
