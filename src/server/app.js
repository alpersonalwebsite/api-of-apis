import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'

import { validateResponse } from './validations/index'

import { geoAPI, geoGetCityInfo, parsedGeoGetCityInfo } from './API/geonames'
import { weatherAPI, weatherGetCity, parsedWeatherGetCity } from './API/weatherbit'
import { pixaAPI, pixaGetCityImage, parsedPixaGetCityImage } from './API/pixabay'

const app = express()

app.use(cors())

app.use(bodyParser.json())

app.use(
  bodyParser.urlencoded({
    extended: true
  })
)

app.use(express.static('dist'))

app.get('/', function (req, res) {
  if (process.env.NODE_ENV !== 'production') {
    res.sendFile(path.resolve('src/client/views/index.html'))
  } else {
    res.sendFile('dist/index.html')
  }
})

app.post('/api', async function (req, res) {
  const data = '{ "msg": "Main endpoint!" }'
  res.status(200).send(data)
})

app.post('/api/travels', async function (req, res) {
  const { city, dates } = req.body

  const geoData = await geoGetCityInfo(geoAPI, city)
  const cityValidation = validateResponse(geoData, 'totalResultsCount')
  if (cityValidation === false) {
    res.send({
      error: {
        type: 'city',
        msg: 'We do not have that city in our records!'
      }
    })
    return
  }

  const geoDataParsed = parsedGeoGetCityInfo(geoData)

  const weatherData = await weatherGetCity(weatherAPI, geoDataParsed, dates)
  const weatherDataParsed = parsedWeatherGetCity(weatherData)

  const pixaData = await pixaGetCityImage(pixaAPI, city)
  const pixaDataParsed = parsedPixaGetCityImage(pixaData)

  const response = {
    city: geoDataParsed,
    weather: weatherDataParsed,
    photos: pixaDataParsed
  }

  res.send(response)
})

export default app
