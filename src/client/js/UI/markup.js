import { generateRandomNumber } from '../utils/index'
import { escapeHTML, safeURL } from './escape'

const generateMarkup = (element = {}, data = {}) => {
  const { type, id, classes } = element

  const newElement = document.createElement(type)
  newElement.setAttribute('id', id)
  newElement.classList.add(...classes)

  const { city, photos, weather } = data

  let markup = markupInfoWrapper(city, photos, weather)

  newElement.innerHTML = markup
  return newElement
}

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

const markupWeather = (data = {}, altForPhoto = '') => {
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
    const tempDate = new Date(element.date)
    markup += `<div class="flex-item">`
    markup += `<div>${tempDate.getMonth() + 1}/${tempDate.getDate()}</div>`
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
