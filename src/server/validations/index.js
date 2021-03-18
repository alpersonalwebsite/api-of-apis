// Given an object, we validate if all its keys are in required properties rray
const validatePropertiesObj = (requiredProperties = [], obj = {}) => {
  for (let element of requiredProperties) {
    if (!obj[element]) return false
  }
  return true
}

// For validating external API responses
const validateResponse = (data = {}, subKey = '') => {
  if (!data[subKey] || data[subKey] === 0) return false
}

// Used for forecast API, which by default, retrieves just 16 days
const warningForMaxDaysForecastAPI = (days) => {
  return days > 16 ? { warning: 'We only support forecast for 16 days' } : null
}

export { validatePropertiesObj, validateResponse, warningForMaxDaysForecastAPI }
