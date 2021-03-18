import { onClickHandler } from './handlers/index'

function app() {
  const button = document.querySelector('input[id="search"]')

  button.addEventListener('click', onClickHandler)
}

app()

export default app
