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

    let builtURL = `${baseURL}${api}/daily?key=${apiKey}&lat=${lat}6&lon=${lng}`
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

  const currentWeather = await getRequest(weatherAPI, 'current', requiredProperties, weatherAPIBaseObject, cityObj)

  const extraParameters = `&days=${days}`
  const forecastWeather = await getRequest(
    weatherAPI,
    'forecast',
    requiredProperties,
    weatherAPIBaseObject,
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

const parsedWeatherGetCity = (apiResponse = {}) => {
  const days = apiResponse.days
  const currentMin = apiResponse.current.data[0].weather
  let forecastMin = []
  for (let element of apiResponse.forecast.data) {
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
