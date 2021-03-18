import dotenv from 'dotenv'
dotenv.config({})

import fetch from 'node-fetch'
import { validatePropertiesObj } from '../validations/index'

const geoAPI = {
  baseURL: 'http://api.geonames.org/',
  apiKey: process.env.GEONAMES_API_KEY,
  maxRows: 1
}

const geoGetCityInfo = async (geoAPIBaseObject, city) => {
  const { baseURL, apiKey, maxRows } = geoAPI

  try {
    const requiredProperties = ['baseURL', 'apiKey', 'maxRows']

    if (!validatePropertiesObj(requiredProperties, geoAPIBaseObject)) {
      throw 'Properties validation error'
    }

    const builtURL = `${baseURL}searchJSON?q=${city}&maxRows=${maxRows}&username=${apiKey}`
    const req = await fetch(builtURL)
    const res = await req.json()

    return res
  } catch (err) {
    console.log(`ERROR: geoGetCityInfo - ${err}`)
    return err
  }
}

const parsedGeoGetCityInfo = (apiResponse = {}) => {
  const objArr = apiResponse.geonames
  const parsedData = []
  for (let obj of objArr) {
    const { lng, lat, name } = obj
    const tempObj = {
      lng,
      lat,
      name
    }
    parsedData.push(tempObj)
  }
  return parsedData[0]
}

export { geoAPI, geoGetCityInfo, parsedGeoGetCityInfo }
