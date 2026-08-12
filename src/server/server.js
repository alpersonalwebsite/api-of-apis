import app from './app'

// PORT from the environment, defaulting to the 8085 this project has always used. A fixed
// port fails on any host that assigns one.
const port = process.env.PORT || 8085

const server = app.listen(port, () => console.log(`Server listening on port ${port}`))

// Without this an occupied port produced an unhandled 'error' event rather than a message:
// on a modern Node that terminates the process with a stack trace and no explanation.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set PORT to something else.`)
  } else {
    console.error(`Server failed to start: ${err.message}`)
  }
  process.exit(1)
})

export default server
