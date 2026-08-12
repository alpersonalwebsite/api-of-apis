import { formatLongDateToISO, getDiffDatesInDays } from '../utils/index'

describe('formatLongDateToISO', () => {
  it('reduces a date to its ISO day', () => {
    expect(formatLongDateToISO('2021-03-15T10:00:00Z')).toBe('2021-03-15')
  })
})

describe('getDiffDatesInDays', () => {
  it('counts whole days between two dates', () => {
    expect(getDiffDatesInDays({ fromDate: '2021-03-15', toDate: '2021-03-17' })).toBe(2)
  })

  it('is zero for the same day', () => {
    expect(getDiffDatesInDays({ fromDate: '2021-03-15', toDate: '2021-03-15' })).toBe(0)
  })

  it('spans a month boundary', () => {
    expect(getDiffDatesInDays({ fromDate: '2021-03-30', toDate: '2021-04-02' })).toBe(3)
  })
})
