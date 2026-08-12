import { parsedGeoGetCityInfo } from '../API/geonames'
import { parsedPixaGetCityImage } from '../API/pixabay'
import { parsedWeatherGetCity } from '../API/weatherbit'

// Every one of these threw a TypeError before. The catch blocks in the API modules `return
// err`, so the error object itself reached these parsers, and `for...of undefined` is not a
// recoverable situation inside an async express handler: measured as a hung request on
// Node 14 and a process exit on Node 15+.
const badInputs = [
  ['an empty object', {}],
  ['an Error, which is what the catch blocks return', new Error('network down')],
  ['null', null],
  ['a string', 'not json']
]

describe('parsers survive what the API modules actually hand them', () => {
  for (const [label, input] of badInputs) {
    it(`parsedGeoGetCityInfo tolerates ${label}`, () => {
      expect(() => parsedGeoGetCityInfo(input)).not.toThrow()
      expect(parsedGeoGetCityInfo(input)).toBeUndefined()
    })

    it(`parsedPixaGetCityImage tolerates ${label}`, () => {
      expect(() => parsedPixaGetCityImage(input)).not.toThrow()
      expect(parsedPixaGetCityImage(input)).toEqual([])
    })

    it(`parsedWeatherGetCity tolerates ${label}`, () => {
      expect(() => parsedWeatherGetCity(input)).not.toThrow()
      expect(parsedWeatherGetCity(input).forecastMin).toEqual([])
    })
  }
})

describe('parsers still parse a good response', () => {
  it('geonames returns the first city, flattened', () => {
    const res = parsedGeoGetCityInfo({
      totalResultsCount: 1,
      geonames: [{ lng: '-0.12574', lat: '51.50853', name: 'London', extra: 'dropped' }]
    })
    expect(res).toEqual({ lng: '-0.12574', lat: '51.50853', name: 'London' })
  })

  it('pixabay keeps previewURL and tags only', () => {
    const res = parsedPixaGetCityImage({ hits: [{ previewURL: 'https://x/a.jpg', tags: 'city', id: 9 }] })
    expect(res).toEqual([{ previewURL: 'https://x/a.jpg', tags: 'city' }])
  })

  it('weatherbit composes current and forecast', () => {
    const res = parsedWeatherGetCity({
      days: { days: 2 },
      current: { data: [{ weather: { icon: 'c02d', description: 'Scattered clouds' } }] },
      forecast: { data: [{ datetime: '2021-03-15', temp: 10.2, weather: { icon: 'c04d' } }] }
    })
    expect(res.currentMin).toEqual({ icon: 'c02d', description: 'Scattered clouds' })
    expect(res.forecastMin).toEqual([{ date: '2021-03-15', temp: 10.2, weather: { icon: 'c04d' } }])
  })
})
