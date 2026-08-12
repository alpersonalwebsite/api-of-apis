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
  // A relative path, not http://localhost:8085. The built bundle is served BY this server,
  // so a same-origin path works in development and wherever it is deployed. The absolute
  // localhost URL meant the production bundle could only ever talk to the developer's own
  // machine, and it is what forced the wide-open CORS the server used to have.
  const data = await postDataToBackend('/api/travels', {
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
