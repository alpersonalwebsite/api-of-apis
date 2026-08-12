// Errors from node-fetch@2.6.1 carry the full request URL in their message, and every URL this
// project builds has an API key in its query string. Measured on the pinned version:
//
//   request to https://…/x?key=SUPERSECRETKEY123 failed, reason: getaddrinfo ENOTFOUND …
//   invalid json response body at https://…/?key=SUPERSECRETKEY123 reason: Unexpected token …
//
// Both contain the key. So interpolating an error into a log line writes the credential to the
// log, and `err.stack` is worse because it contains the message too. Every log boundary that
// touches an upstream error goes through this instead.
//
// Only fields that cannot carry a URL are kept: the operation name we control, plus the error's
// name, and its code or type where node-fetch sets one.
const describeError = (operation, err) => {
  if (err === null || err === undefined) return `${operation}: unknown error`
  const name = (err && err.name) || typeof err
  const code = (err && (err.code || err.type)) || 'none'
  return `${operation}: ${name} (code: ${code})`
}

export { describeError }
