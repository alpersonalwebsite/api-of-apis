import { describeError } from '../utils/logging'

// The literal below is a stand-in for a real key. What matters is that describeError never
// returns it, whatever shape of error node-fetch produced.
const KEY = 'SUPERSECRET123456'

describe('describeError never emits a request URL or a credential', () => {
  const errors = [
    [
      'node-fetch network failure',
      Object.assign(
        new Error(
          `request to https://api.geonames.org/searchJSON?q=London&username=${KEY} failed, reason: getaddrinfo ENOTFOUND`
        ),
        { name: 'FetchError', type: 'system', code: 'ENOTFOUND' }
      )
    ],
    [
      'node-fetch invalid json',
      Object.assign(
        new Error(`invalid json response body at https://pixabay.com/api/?key=${KEY} reason: Unexpected token <`),
        { name: 'FetchError', type: 'invalid-json' }
      )
    ],
    ['a plain Error carrying a URL', new Error(`boom https://x/?key=${KEY}`)],
    ['a thrown string', `failed for https://x/?key=${KEY}`],
    ['null', null],
    ['undefined', undefined]
  ]

  it.each(errors)('redacts %s', (_label, err) => {
    const out = describeError('op', err)
    expect(out).not.toContain(KEY)
    expect(out).not.toContain('http')
    expect(out).not.toContain('key=')
    expect(out).not.toContain('username=')
  })

  it('still says enough to diagnose with', () => {
    const err = Object.assign(new Error(`request to https://x/?key=${KEY} failed`), {
      name: 'FetchError',
      code: 'ENOTFOUND'
    })
    expect(describeError('geoGetCityInfo', err)).toBe('geoGetCityInfo: FetchError (code: ENOTFOUND)')
  })
})
