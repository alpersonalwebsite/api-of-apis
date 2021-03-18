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
    console.log(`ERROR: pixaGetCityImage - ${err}`)
    return err
  }
}

const parsedPixaGetCityImage = (apiResponse = {}) => {
  const objArr = apiResponse.hits
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
