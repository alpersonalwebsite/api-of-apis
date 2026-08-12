import dotenv from 'dotenv'
dotenv.config({})
import fetch from 'node-fetch'
import { validatePropertiesObj } from '../validations/index'

const pixaAPI = {
  baseURL: 'https://pixabay.com/api/',
  apiKey: process.env.PIXABAY_API_KEY
}

const pixaGetCityImage = async (pixaAPIBaseObject, city) => {
  const { baseURL, apiKey } = pixaAPI

  try {
    const requiredProperties = ['baseURL', 'apiKey']

    if (!validatePropertiesObj(requiredProperties, pixaAPIBaseObject)) {
      throw 'Properties validation error'
    }

    const builtURL = `${baseURL}?key=${apiKey}&image_type=photo&q=${city}&per_page=3`
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
    console.log(`ERROR: pixaGetCityImage - ${err}`)
    throw err instanceof Error ? err : new Error(String(err))
  }
}

// Same guard as the geonames parser: `hits` is absent on an error response, and
// `for...of undefined` threw. Pixabay also legitimately returns zero hits for an obscure
// query, so an empty array is a normal answer, not a failure.
const parsedPixaGetCityImage = (apiResponse = {}) => {
  const objArr = apiResponse && apiResponse.hits
  if (!Array.isArray(objArr)) return []
  const parsedData = []
  for (let obj of objArr) {
    const { previewURL, tags } = obj
    const tempObj = {
      previewURL,
      tags
    }
    parsedData.push(tempObj)
  }
  return parsedData
}

export { pixaAPI, pixaGetCityImage, parsedPixaGetCityImage }
