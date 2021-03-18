import { generateRandomNumber } from '../utils/index'

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
  return `<h2>${data.name}</h2>`
}

const markupPhotos = (data = [], altForPhoto = '') => {
  const randomIndex = generateRandomNumber(data.length)
  const selectedElement = data[randomIndex]
  return `<img src='${selectedElement.previewURL}' alt='${altForPhoto}' />`
}

const markupWeather = (data = {}, altForPhoto = '') => {
  return `
    <div class="container">
      <img src='https://www.weatherbit.io/static/img/icons/${data.icon}.png' alt='${altForPhoto}' />
      <span>Current weather: ${data.description}</span>
    </div>
  `
}

const markupWeatherForecast = (forecast = []) => {
  let markup = '<div class="travel-forecast">'
  for (let element of forecast) {
    const tempDate = new Date(element.date)
    markup += `<div class="flex-item">`
    markup += `<div>${tempDate.getMonth()}/${tempDate.getDate()}</div>`
    markup += `<img src='https://www.weatherbit.io/static/img/icons/${element.weather.icon}.png' alt='${element.weather.description}' />`
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
  markup += `${weather.days.warning ? weather.days.warning : ''}`
  markup += `${markupWeatherForecast(weather.forecastMin)}`
  return markup
}

const addMarkup = (element = {}, markup = '', childElement = {}) => {
  const elementType = element.selectorType === 'id' ? '#' : '.'
  const elementText = element.selectorText

  const childElementToremove = document.getElementById(childElement.id)

  const selectedElement = document.querySelector(`${elementType}${elementText}`)
  if (childElementToremove) {
    selectedElement.getElementsByClassName.display = 'none'
    selectedElement.removeChild(childElementToremove)
    selectedElement.getElementsByClassName.display = 'block'
  }

  document.querySelector(`${elementType}${elementText}`).appendChild(markup)
  return
}

export { generateMarkup, addMarkup }
