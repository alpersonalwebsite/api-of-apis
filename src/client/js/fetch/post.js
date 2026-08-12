import { validateData } from '../validations/index'

const postDataToBackend = async (url, data) => {
  validateData('object', data)

  try {
    const req = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    const response = await req.json()
    return response
  } catch (err) {
    console.log(`postDataToBackend error: ${err}`)
    return null
  }
}

export { postDataToBackend }
