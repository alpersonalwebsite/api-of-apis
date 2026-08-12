// The three API modules are mocked so no key and no network are needed. What is under test
// is the route's own behaviour: input validation, the not-found path, and above all what
// happens when an upstream call blows up.
// Inline factories, then require() the mocked modules. Two things forced this shape:
//
//   - `jest.mock(path)` with no factory does not work here at all. jest-esm-transformer
//     compiles `export { a, b }` into read-only getters on exports, so automocking yields
//     plain values and `geoGetCityInfo.mockResolvedValue` is not a function.
//   - Declaring the mock objects as outer consts and referencing them from the factory does
//     not work either: jest hoists jest.mock calls above the const declarations, so the
//     module under test received a different object and every call fell through to a 404.
//   - `import app from '../app'` at the top loaded the real API modules BEFORE the mocks
//     applied, because jest-esm-transformer does not run babel-plugin-jest-hoist, so
//     jest.mock calls are NOT hoisted above ESM imports here. Measured: the route answered
//     404 for every case and geoGetCityInfo.mock.calls.length was 0, i.e. the real module
//     had run. Requiring the app AFTER the mock calls gives 200 and one recorded call.
//
// Defining the jest.fn()s inside the factory, and require()ing both the mocks and the app
// after those calls, avoids all three.
jest.mock('../API/geonames', () => ({
  geoAPI: { baseURL: 'https://x/', apiKey: 'k', maxRows: 1 },
  geoGetCityInfo: jest.fn(),
  parsedGeoGetCityInfo: jest.fn()
}))
jest.mock('../API/weatherbit', () => ({
  weatherAPI: { baseURL: 'https://y/', apiKey: 'k' },
  weatherGetCity: jest.fn(),
  parsedWeatherGetCity: jest.fn()
}))
jest.mock('../API/pixabay', () => ({
  pixaAPI: { baseURL: 'https://z/', apiKey: 'k' },
  pixaGetCityImage: jest.fn(),
  parsedPixaGetCityImage: jest.fn()
}))

const request = require('supertest')
const geonames = require('../API/geonames')
const weatherbit = require('../API/weatherbit')
const pixabay = require('../API/pixabay')
const app = require('../app').default

const GOOD_GEO = { totalResultsCount: 1, geonames: [{ lng: '-0.1', lat: '51.5', name: 'London' }] }

beforeEach(() => {
  jest.clearAllMocks()
  geonames.geoGetCityInfo.mockResolvedValue(GOOD_GEO)
  geonames.parsedGeoGetCityInfo.mockReturnValue({ lng: '-0.1', lat: '51.5', name: 'London' })
  weatherbit.weatherGetCity.mockResolvedValue({})
  weatherbit.parsedWeatherGetCity.mockReturnValue({ days: { days: 2 }, currentMin: null, forecastMin: [] })
  pixabay.pixaGetCityImage.mockResolvedValue({ hits: [] })
  pixabay.parsedPixaGetCityImage.mockReturnValue([])
})

const body = { city: 'London', dates: { fromDate: '2021-03-15', toDate: '2021-03-17' } }

describe('POST /api/travels', () => {
  it('composes the three responses on the happy path', async () => {
    const res = await request(app).post('/api/travels').send(body)
    expect(res.status).toBe(200)
    expect(res.body.city.name).toBe('London')
    expect(res.body).toHaveProperty('weather')
    expect(res.body).toHaveProperty('photos')
  })

  it('rejects a missing or blank city with 400', async () => {
    for (const bad of [{}, { city: '   ', dates: body.dates }, { city: 42, dates: body.dates }]) {
      const res = await request(app).post('/api/travels').send(bad)
      expect(res.status).toBe(400)
      expect(res.body.error.type).toBe('city')
    }
  })

  it('rejects missing dates with 400', async () => {
    const res = await request(app).post('/api/travels').send({ city: 'London' })
    expect(res.status).toBe(400)
    expect(res.body.error.type).toBe('dates')
  })

  it('answers 404 when the city is not in the geocoding results', async () => {
    geonames.geoGetCityInfo.mockResolvedValue({ totalResultsCount: 0 })
    const res = await request(app).post('/api/travels').send(body)
    expect(res.status).toBe(404)
    expect(res.body.error.type).toBe('city')
  })

  // This is the test that matters most. Before the error middleware existed, a throw here
  // was an unhandled promise rejection inside an async express 4 handler: measured as a
  // request that never gets a response on Node 14, and a process that exits code 1 on
  // Node 15+. Either way the client waits forever. A 502 is the whole point.
  it.each([
    ['geonames lookup', () => geonames.geoGetCityInfo.mockRejectedValue(new Error('geonames down'))],
    [
      'geonames parser',
      () =>
        geonames.parsedGeoGetCityInfo.mockImplementation(() => {
          throw new TypeError('objArr is not iterable')
        })
    ],
    ['weather lookup', () => weatherbit.weatherGetCity.mockRejectedValue(new Error('weatherbit down'))],
    [
      'weather parser',
      () =>
        weatherbit.parsedWeatherGetCity.mockImplementation(() => {
          throw new TypeError('cannot read data')
        })
    ],
    ['pixabay lookup', () => pixabay.pixaGetCityImage.mockRejectedValue(new Error('pixabay down'))],
    [
      'pixabay parser',
      () =>
        pixabay.parsedPixaGetCityImage.mockImplementation(() => {
          throw new TypeError('hits is not iterable')
        })
    ]
  ])('answers 502 instead of hanging when the %s fails', async (_label, arrange) => {
    arrange()
    const res = await request(app).post('/api/travels').send(body)
    expect(res.status).toBe(502)
    expect(res.body.error.type).toBe('upstream')
  })

  it('answers 502 when geocoding returns nothing usable', async () => {
    geonames.parsedGeoGetCityInfo.mockReturnValue(undefined)
    const res = await request(app).post('/api/travels').send(body)
    expect(res.status).toBe(502)
  })
})

describe('CORS', () => {
  it('does not send a wildcard allow-origin', async () => {
    const res = await request(app).post('/api/travels').set('Origin', 'https://evil.example').send(body)
    expect(res.headers['access-control-allow-origin']).not.toBe('*')
  })
})

describe('date validation', () => {
  const withDates = (fromDate, toDate) => ({ city: 'London', dates: { fromDate, toDate } })

  it('rejects unparseable dates', async () => {
    for (const bad of [
      ['invalid', '2021-03-17'],
      ['2021-03-15', 'nonsense'],
      ['', '']
    ]) {
      const res = await request(app).post('/api/travels').send(withDates(bad[0], bad[1]))
      expect(res.status).toBe(400)
      expect(res.body.error.type).toBe('dates')
    }
  })

  it('rejects a reversed range', async () => {
    const res = await request(app).post('/api/travels').send(withDates('2021-03-17', '2021-03-15'))
    expect(res.status).toBe(400)
    expect(res.body.error.msg).toMatch(/precede/)
  })

  it('accepts a single-day range', async () => {
    const res = await request(app).post('/api/travels').send(withDates('2021-03-15', '2021-03-15'))
    expect(res.status).toBe(200)
  })
})

describe('calendar-invalid dates', () => {
  const withDates = (fromDate, toDate) => ({ city: 'London', dates: { fromDate, toDate } })

  // new Date('2021-02-30') does not throw, it normalises to 2 March 2021. So a date that does
  // not exist used to pass validation and become a real trip.
  it.each([
    ['30 February', '2021-02-30'],
    ['31 April', '2021-04-31'],
    ['month 13', '2021-13-01'],
    ['day 32', '2021-01-32'],
    ['29 February in a non-leap year', '2021-02-29'],
    ['not zero-padded', '2021-3-5'],
    ['a full timestamp', '2021-03-15T00:00:00Z']
  ])('rejects %s', async (_label, bad) => {
    const res = await request(app).post('/api/travels').send(withDates(bad, '2021-03-17'))
    expect(res.status).toBe(400)
    expect(res.body.error.type).toBe('dates')
  })

  it('accepts 29 February in a leap year', async () => {
    const res = await request(app).post('/api/travels').send(withDates('2020-02-29', '2020-03-01'))
    expect(res.status).toBe(200)
  })
})
