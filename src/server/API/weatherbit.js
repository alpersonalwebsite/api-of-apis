import dotenv from 'dotenv'
dotenv.config({})
import fetch from 'node-fetch'
import { validatePropertiesObj, warningForMaxDaysForecastAPI } from '../validations/index'
import { getDiffDatesInDays } from '../utils/index'

const weatherAPI = {
  baseURL: 'https://api.weatherbit.io/v2.0/',
  apiKey: process.env.WEATHERBIT_API_KEY
}

const getRequest = async (
  weatherAPIconfigurationObject,
  api,
  requiredProperties,
  objectProperties,
  cityObject,
  extraParams
) => {
  const { baseURL, apiKey } = weatherAPIconfigurationObject
  const { lng, lat } = cityObject

  try {
    if (!validatePropertiesObj(requiredProperties, objectProperties)) {
      throw 'Properties validation error'
    }

    // Two bugs were in this one line.
    //
    // 1. `lat=${lat}6` appended a stray 6 to every latitude, and the damage scales inversely
    //    with precision, so quoting a high-precision example understates it badly:
    //
    //      40.7128 -> 40.71286   0.0001 deg, about 11 m
    //      51.5    -> 51.56      0.06 deg,   about 6.7 km
    //      4       -> 46         42 deg,     about 4,700 km
    //      0       -> 6          6 deg
    //
    //    geonames returns whatever precision it has, so a low-precision latitude asked
    //    about a different continent. It never errored either way.
    //
    // 2. `${api}/daily` is only correct for one of the two callers. Per Weatherbit's docs
    //    the current-conditions endpoint is `/v2.0/current` and there is no
    //    `/current/daily`; the 16-day forecast is `/v2.0/forecast/daily`. So the current
    //    call was hitting a path that does not exist.
    let builtURL = `${baseURL}${api}?key=${apiKey}&lat=${lat}&lon=${lng}`
    if (extraParams) builtURL += `${extraParams}`

    const req = await fetch(builtURL)
    const res = await req.json()

    return res
  } catch (err) {
    console.log(`ERROR: weatherGetCity - ${err}`)
    return err
  }
}

const weatherGetCity = async (weatherAPIBaseObject, cityObj, dates) => {
  const days = getDiffDatesInDays(dates)
  const daysComposedObj = {
    days,
    ...warningForMaxDaysForecastAPI(days)
  }

  const requiredProperties = ['baseURL', 'apiKey']

  // The config passed in is the one used, not the module-level weatherAPI. It used to
  // validate the argument and then build the URL from the module constant, so a caller could
  // hand in a perfectly good object and have it ignored. That also made this function
  // untestable without setting process.env before importing the module.
  const config = weatherAPIBaseObject || weatherAPI

  const currentWeather = await getRequest(config, 'current', requiredProperties, config, cityObj)

  const extraParameters = `&days=${days}`
  const forecastWeather = await getRequest(
    config,
    'forecast/daily',
    requiredProperties,
    config,
    cityObj,
    extraParameters
  )

  const weatherObj = {
    current: currentWeather,
    forecast: forecastWeather,
    days: daysComposedObj
  }

  return weatherObj
}

// Guarded for the same reason as the other two parsers: `apiResponse.current.data[0]` threw
// a TypeError whenever the upstream call failed, because the catch block above returns the
// error object as though it were data. That surfaced as a hung request on Node 14 and a
// dead process on Node 15+.
const parsedWeatherGetCity = (apiResponse = {}) => {
  const days = apiResponse && apiResponse.days
  const currentData = apiResponse && apiResponse.current && apiResponse.current.data
  const currentMin = Array.isArray(currentData) && currentData.length > 0 ? currentData[0].weather : null
  const forecastData = apiResponse && apiResponse.forecast && apiResponse.forecast.data
  let forecastMin = []
  for (let element of Array.isArray(forecastData) ? forecastData : []) {
    const { datetime, temp, weather } = element
    forecastMin.push({
      date: datetime,
      temp,
      weather
    })
  }

  return {
    days,
    currentMin,
    forecastMin
  }
}

export { weatherAPI, weatherGetCity, parsedWeatherGetCity }
