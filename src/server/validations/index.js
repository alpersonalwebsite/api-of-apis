// Given an object, we validate if all its keys are in required properties rray
const validatePropertiesObj = (requiredProperties = [], obj = {}) => {
  for (let element of requiredProperties) {
    if (!obj[element]) return false
  }
  return true
}

// For validating external API responses.
//
// This used to be:
//   if (!data[subKey] || data[subKey] === 0) return false
// which returns false or UNDEFINED, never true. The only caller compensated by testing
// `=== false`, so it worked by accident; `if (!validateResponse(...))` would have rejected
// every city that was found. The `=== 0` clause was also dead, since `!data[subKey]`
// already catches 0.
const validateResponse = (data = {}, subKey = '') => {
  if (data === null || typeof data !== 'object') return false
  return Boolean(data[subKey])
}

// Used for forecast API, which by default, retrieves just 16 days
const warningForMaxDaysForecastAPI = (days) => {
  return days > 16 ? { warning: 'We only support forecast for 16 days' } : null
}

export { validatePropertiesObj, validateResponse, warningForMaxDaysForecastAPI }
