import { generateRandomNumber } from '../utils/index'
import { escapeHTML, safeURL } from './escape'

const generateMarkup = (element = {}, data = {}) => {
  const { type, id, classes } = element

  const newElement = document.createElement(type)
  newElement.setAttribute('id', id)
  newElement.classList.add(...classes)

  // Normalised, not defaulted. A default parameter applies to `undefined` only, so `null`
  // passed straight through and `data.icon` threw
  // `TypeError: Cannot read properties of null`. That is not hypothetical: the route returns
  // whatever parsedWeatherGetCity produced, and its documented fallback for a weatherbit
  // response with no current data is `currentMin: null`. So an otherwise successful travel
  // response could stop the client rendering.
  const safe = data || {}
  const city = safe.city || {}
  const photos = Array.isArray(safe.photos) ? safe.photos : []
  const weather = safe.weather || {}

  let markup = markupInfoWrapper(city, photos, weather)

  newElement.innerHTML = markup
  return newElement
}

// No `|| {}` here on purpose. markupCity is not exported and its only caller passes the
// already-normalised `city` from markupInfoWrapper, so a null can never reach it. Adding a
// guard produced a branch no test could reach: reverting it left all 84 tests green, which is
// the signature of dead defence rather than defence in depth.
const markupCity = (data = {}) => {
  return `<h2>${escapeHTML(data.name)}</h2>`
}

const markupPhotos = (data = [], altForPhoto = '') => {
  // An empty photos array made generateRandomNumber(0) index undefined and this threw
  // on `.previewURL`. Pixabay legitimately returns no hits for an obscure query.
  if (!Array.isArray(data) || data.length === 0) return ''
  const randomIndex = generateRandomNumber(data.length)
  const selectedElement = data[randomIndex] || {}
  return `<img src="${safeURL(selectedElement.previewURL)}" alt="${escapeHTML(altForPhoto)}" />`
}

const markupWeather = (rawData = {}, altForPhoto = '') => {
  const data = rawData || {}
  // The icon code is pasted into a URL path, so it is restricted to the shape weatherbit
  // actually uses (letters and digits, e.g. c02d). Anything else would let a compromised
  // or unexpected response steer the path.
  const icon = /^[a-z0-9]{1,8}$/i.test(String(data.icon || '')) ? data.icon : ''
  const iconTag = icon
    ? `<img src="https://www.weatherbit.io/static/img/icons/${icon}.png" alt="${escapeHTML(altForPhoto)}" />`
    : ''
  return `
    <div class="container">
      ${iconTag}
      <span>Current weather: ${escapeHTML(data.description)}</span>
    </div>
  `
}

const markupWeatherForecast = (forecast = []) => {
  let markup = '<div class="travel-forecast">'
  for (let element of Array.isArray(forecast) ? forecast : []) {
    // A forecast object can arrive with a missing or unparseable datetime. The server parser
    // filters null and primitive ENTRIES but does not inspect the date inside a valid object,
    // so this loop used to render NaN/NaN.
    // The date must be a non-empty string BEFORE constructing a Date, because new Date(null)
    // is 1 January 1970 rather than an Invalid Date, and new Date(0) is too. Checking only
    // getTime() for NaN let a null datetime render as 1/1. Measured:
    //   new Date(null) -> 1970-01-01   new Date('') -> Invalid   new Date(0) -> 1970-01-01
    const rawDate = element && element.date
    if (typeof rawDate !== 'string' || rawDate.trim() === '') continue
    const tempDate = new Date(rawDate)
    if (Number.isNaN(tempDate.getTime())) continue
    markup += `<div class="flex-item">`
    // UTC getters. `new Date('2021-03-15')` is parsed as UTC midnight, and the local getters
    // then report 14 March anywhere west of UTC. The original used getMonth(), which was also
    // zero-based, so this line was wrong twice: it showed 2/15 in UTC and 2/14 in New York.
    markup += `<div>${tempDate.getUTCMonth() + 1}/${tempDate.getUTCDate()}</div>`
    const weather = element.weather || {}
    // No optional chaining: .eslintrc.js pins ecmaVersion to 2018, which predates it, and
    // this project's era is 2021 rather than whatever the current syntax allows.
    const icon = /^[a-z0-9]{1,8}$/i.test(String(weather.icon || '')) ? weather.icon : ''
    if (icon) {
      markup += `<img src="https://www.weatherbit.io/static/img/icons/${icon}.png" alt="${escapeHTML(
        weather.description
      )}" />`
    }
    markup += `</div>`
  }
  markup += '</div>'
  return markup
}

const markupInfoWrapper = (city, photos, weather) => {
  let markup = ``
  markup += `<div class="travel-info">`
  markup += `<div class="travel-image">${markupPhotos(photos, city.name)}</div>`
  markup += `<div class="travel-city">`
  markup += markupCity(city)
  markup += markupWeather(weather.currentMin, city.name)
  markup += `</div>`
  markup += `</div>`
  markup += `<h3>Forecast</h3>`
  markup += `${weather.days && weather.days.warning ? escapeHTML(weather.days.warning) : ''}`
  markup += `${markupWeatherForecast(weather.forecastMin)}`
  return markup
}

const addMarkup = (element = {}, markup = '', childElement = {}) => {
  const elementType = element.selectorType === 'id' ? '#' : '.'
  const elementText = element.selectorText

  const childElementToremove = document.getElementById(childElement.id)

  const selectedElement = document.querySelector(`${elementType}${elementText}`)
  if (childElementToremove) {
    // Was `selectedElement.getElementsByClassName.display = 'none'` and back to 'block'.
    // getElementsByClassName is a METHOD, so those two lines set a property on a function
    // object and did nothing at all. The removeChild between them is the only part that
    // ever had an effect, so the wrapper is gone rather than corrected.
    selectedElement.removeChild(childElementToremove)
  }

  document.querySelector(`${elementType}${elementText}`).appendChild(markup)
  return
}

export { generateMarkup, addMarkup }
