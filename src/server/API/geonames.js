import dotenv from 'dotenv'
dotenv.config({})

import fetch from 'node-fetch'
import { describeError } from '../utils/logging'
import { validatePropertiesObj } from '../validations/index'

const geoAPI = {
  // https, not http: the username travels in the query string and plain HTTP puts it on
  // the wire in clear text. geonames serves the same API over TLS.
  baseURL: 'https://secure.geonames.org/',
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
    // Re-thrown, not returned. This used to `return err`, which meant a network failure or a
    // bad JSON body left an Error object standing in for a response. Downstream that error
    // reached validateResponse and the parsers, so a geonames outage produced a false 404
    // ("We do not have that city in our records") and a weatherbit or pixabay outage produced
    // a 200 with empty fallback data. Measured before this change, with node-fetch rejecting:
    // POST /api/travels answered 404. The route's try/catch turns a throw into a 502, which is
    // the honest answer for "an upstream service failed".
    console.log(describeError('geoGetCityInfo', err))
    throw err instanceof Error ? err : new Error(String(err))
  }
}

// Returns undefined rather than throwing when the response has no `geonames` array.
// It used to do `for (let obj of apiResponse.geonames)`, which threw
// `TypeError: objArr is not iterable` both for `{}` and for the Error object the catch
// block above returns on a network failure. Inside an async express handler that became an
// unhandled rejection: a hung request on Node 14, a dead process on Node 15+.
const parsedGeoGetCityInfo = (apiResponse = {}) => {
  const objArr = apiResponse && apiResponse.geonames
  if (!Array.isArray(objArr) || objArr.length === 0) return undefined
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
