import { validatePropertiesObj, validateResponse, warningForMaxDaysForecastAPI } from '../validations/index'

describe('validateResponse', () => {
  // The point of these three: the original returned false or undefined and NEVER true, so
  // the only caller had to test `=== false`. The first case is the one that used to fail.
  it('returns true for a response that has the key', () => {
    expect(validateResponse({ totalResultsCount: 3 }, 'totalResultsCount')).toBe(true)
  })

  it('returns false for zero results', () => {
    expect(validateResponse({ totalResultsCount: 0 }, 'totalResultsCount')).toBe(false)
  })

  it('returns false when the key is missing, and for non-objects', () => {
    expect(validateResponse({}, 'totalResultsCount')).toBe(false)
    expect(validateResponse(null, 'totalResultsCount')).toBe(false)
    expect(validateResponse(new Error('network down'), 'totalResultsCount')).toBe(false)
  })

  it('never returns undefined, which is what made the old version unusable', () => {
    for (const input of [{ totalResultsCount: 3 }, { totalResultsCount: 0 }, {}, null]) {
      expect(typeof validateResponse(input, 'totalResultsCount')).toBe('boolean')
    }
  })
})

describe('validatePropertiesObj', () => {
  it('is true only when every required key is present and truthy', () => {
    expect(validatePropertiesObj(['a', 'b'], { a: 1, b: 2 })).toBe(true)
    expect(validatePropertiesObj(['a', 'b'], { a: 1 })).toBe(false)
    expect(validatePropertiesObj(['a'], { a: '' })).toBe(false)
  })

  it('is vacuously true with no required properties', () => {
    expect(validatePropertiesObj([], {})).toBe(true)
  })
})

describe('warningForMaxDaysForecastAPI', () => {
  it('warns above the 16-day ceiling and not at it', () => {
    expect(warningForMaxDaysForecastAPI(17)).toEqual({ warning: 'We only support forecast for 16 days' })
    expect(warningForMaxDaysForecastAPI(16)).toBeNull()
    expect(warningForMaxDaysForecastAPI(1)).toBeNull()
  })
})
