const formatLongDateToISO = (dateString) => {
  const date = new Date(dateString)
  const reg = /.+?(?=T)/i
  return date.toISOString().match(reg)[0]
}

const getDiffDatesInDays = (datesObj = {}) => {
  const from = new Date(formatLongDateToISO(datesObj.fromDate))
  const to = new Date(formatLongDateToISO(datesObj.toDate))
  const difference = to.getTime() - from.getTime()
  const differenceIndays = Math.round(difference / (1000 * 3600 * 24))
  return differenceIndays
}

export { formatLongDateToISO, getDiffDatesInDays }
