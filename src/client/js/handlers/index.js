import { postDataToBackend } from '../fetch/post'
import { generateMarkup, addMarkup } from '../UI/markup'
import { shouldNotBeEmpty } from '../validations/index'

const onClickHandler = async () => {

  const fromPlace = document.querySelector('input[id="from-place"]').value
  const toPlace = document.querySelector('input[id="to-place"]').value
  const fromDate = document.querySelector('input[id="from-date"]').value
  const toDate = document.querySelector('input[id="to-date"]').value

  const inputsMapping = {
    Destination: toPlace,
    'Departure date': fromPlace,
    'Arrival date': toDate
  }

  const emptyInputs = shouldNotBeEmpty(inputsMapping)
  if (emptyInputs !== 0) return
  const data = await postDataToBackend('http://localhost:8085/api/travels', {
    city: toPlace,
    dates: { fromDate, toDate }
  })
  if (data.error) {
    return cityErrorHandler(data.error)
  }

  const element = { selectorType: 'id', selectorText: 'results' }
  const childElement = {
    type: 'div',
    id: 'travel',
    classes: ['data-travel']
  }

  const markup = generateMarkup(childElement, data)
  addMarkup(element, markup, childElement)
}

const cityErrorHandler = (err) => {
  if (err.type === 'city') alert(err.msg)
}

export { onClickHandler, cityErrorHandler }
