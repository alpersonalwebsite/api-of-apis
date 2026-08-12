import path from 'path'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'

import { validateResponse } from './validations/index'

import { geoAPI, geoGetCityInfo, parsedGeoGetCityInfo } from './API/geonames'
import { weatherAPI, weatherGetCity, parsedWeatherGetCity } from './API/weatherbit'
import { pixaAPI, pixaGetCityImage, parsedPixaGetCityImage } from './API/pixabay'

const app = express()

// `cors()` with no arguments sends Access-Control-Allow-Origin: *, which on a server whose
// entire purpose is proxying three keyed APIs means any page on the internet can spend your
// quota. Restrict it to the origins this app is actually served from. CORS_ORIGIN accepts a
// comma-separated list; with none set, only same-origin requests work, which is what the
// bundled client does anyway.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false
  })
)

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

app.post('/api/travels', async function (req, res, next) {
  try {
    await handleTravels(req, res)
  } catch (err) {
    next(err)
  }
})

async function handleTravels(req, res) {
  const { city, dates } = req.body || {}

  if (typeof city !== 'string' || city.trim() === '') {
    res.status(400).send({ error: { type: 'city', msg: 'A city name is required.' } })
    return
  }
  if (!dates || typeof dates.fromDate !== 'string' || typeof dates.toDate !== 'string') {
    res.status(400).send({ error: { type: 'dates', msg: 'fromDate and toDate are required.' } })
    return
  }

  // Type alone was not enough: 'invalid' is a string, and so is a toDate that precedes
  // fromDate. Both used to pass straight through to the date arithmetic, where
  // getDiffDatesInDays produced NaN or a negative day count and sent it to weatherbit as
  // &days=NaN.
  const from = new Date(dates.fromDate)
  const to = new Date(dates.toDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    res.status(400).send({ error: { type: 'dates', msg: 'fromDate and toDate must be valid dates.' } })
    return
  }
  if (to.getTime() < from.getTime()) {
    res.status(400).send({ error: { type: 'dates', msg: 'toDate must not precede fromDate.' } })
    return
  }

  const geoData = await geoGetCityInfo(geoAPI, city)
  // validateResponse returns true for a usable answer now. It used to return false or
  // undefined and never true, so this had to be written as `=== false`; anything more
  // natural, like `if (!cityValidation)`, rejected every city that WAS found.
  if (!validateResponse(geoData, 'totalResultsCount')) {
    res.status(404).send({
      error: {
        type: 'city',
        msg: 'We do not have that city in our records!'
      }
    })
    return
  }

  const geoDataParsed = parsedGeoGetCityInfo(geoData)
  if (!geoDataParsed) {
    res.status(502).send({
      error: { type: 'city', msg: 'The geocoding service returned no usable result.' }
    })
    return
  }

  const weatherData = await weatherGetCity(weatherAPI, geoDataParsed, dates)
  const weatherDataParsed = parsedWeatherGetCity(weatherData)

  const pixaData = await pixaGetCityImage(pixaAPI, city)
  const pixaDataParsed = parsedPixaGetCityImage(pixaData)

  res.send({
    city: geoDataParsed,
    weather: weatherDataParsed,
    photos: pixaDataParsed
  })
}

// Express 4 does not catch a rejected promise from an async handler, so without this every
// unexpected shape from an upstream API became an unhandled rejection. Measured against
// express 4.17.1: on Node 14 the request simply hangs with no response, and on Node 15+
// the whole server process exits with code 1. The handler is wrapped above; this turns
// whatever it threw into a 502.
// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
  console.error(`ERROR: /api/travels - ${err && err.stack ? err.stack : err}`)
  if (res.headersSent) return
  res.status(502).send({
    error: { type: 'upstream', msg: 'An upstream service failed or returned an unexpected response.' }
  })
})

export default app
