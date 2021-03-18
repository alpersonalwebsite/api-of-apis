const validateData = (expectedInputType, data) => {
  if (typeof data === expectedInputType) return data
  else console.log(`ERROR: Please, provide the proper data type. Expected: ${expectedInputType}, passed ${typeof data}`)
}

const shouldNotBeEmpty = (userInput = {}) => {
  let emptyInputs = 0
  for (let property in userInput) {
    if (userInput[property] === '') {
      emptyInputs++
      alert(`${property} cannot be empty`)
    }
  }
  return emptyInputs
}

export { validateData, shouldNotBeEmpty }
