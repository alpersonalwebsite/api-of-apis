# API of APIs

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

One request fanned out to three public APIs and composed server-side. You type a city and a
date range; the server geocodes the city with **geonames**, asks **weatherbit** for current
conditions and a forecast for those coordinates, fetches a photo from **pixabay**, and
returns a single object. Built March 2021 as Udacity's travel-app project.

The point of the shape is that the browser never sees an API key. The client posts to
`/api/travels` and the three keyed calls happen on the server.

The overview here used to read `TO ADD...`, so this is the first version that describes
the project.

## What changed, and why

The app worked in the sense that a happy path returned data. Under that, a handful of things
were quietly wrong. Each item below was measured, and the commands are in the repository's
test suite so they cannot drift.

**The weather was for the wrong place.** One line in `src/server/API/weatherbit.js` built
the request URL, and it had two bugs:

```js
`${baseURL}${api}/daily?key=${apiKey}&lat=${lat}6&lon=${lng}`
```

The `6` after `${lat}` appended a digit to every latitude, and how bad that is depends
inversely on precision, so the high-precision example is the least alarming one:

| latitude | sent as | shift |
| --- | --- | --- |
| `40.7128` | `40.71286` | 0.0001°, about 11 m |
| `51.5` | `51.56` | 0.06°, about 6.7 km |
| `4` | `46` | 42°, about 4,700 km |
| `0` | `6` | 6° |

geonames returns whatever precision it holds for a place, so a low-precision latitude asked
about a different continent. Nothing errored in any case.

`${api}/daily` was also only right for one of its two callers. Per Weatherbit's
documentation the current-conditions endpoint is `/v2.0/current` and **there is no
`/current/daily`**; the 16-day forecast is `/v2.0/forecast/daily`. So the current-weather
call was requesting a path that does not exist.

**A failed upstream call took the server with it.** The route was `async` and Express 4 does
not catch a rejected promise from an async handler. The three `catch` blocks in the API
modules `return err`, so an error object flowed onward as if it were data, and the parsers
did `for (let obj of apiResponse.geonames)` on it. Measured against express 4.17.1:

| runtime | what a failed upstream call did |
| --- | --- |
| Node 14 | `TypeError: objArr is not iterable`, then the request **hangs with no response** (3020 ms, no reply) |
| Node 15+ | the same TypeError, then the **process exits with code 1** |

So one bad response from a third party either hung the client forever or killed the server.
The parsers return an empty result instead of throwing, and the route is wrapped so anything
unexpected becomes a `502` with a message.

**A validation function that could never say yes.** `validateResponse` was:

```js
if (!data[subKey] || data[subKey] === 0) return false
```

which returns `false` or `undefined`, and never `true`. Its only caller compensated by
testing `=== false`, so the app worked by accident: written the obvious way,
`if (!validateResponse(...))`, it rejected every city that *was* found. The `=== 0` clause
was dead too, since `!data[subKey]` already catches `0`. It returns a real boolean now.

**Third-party text went into `innerHTML` unescaped.** `src/client/js/UI/markup.js` builds
HTML from geonames, weatherbit and pixabay values and assigns it to `innerHTML`, with the
attributes single-quoted. Measured: a `previewURL` of `x' onerror='alert(1)` produces

```text
<img src='x' onerror='alert(1)' alt='...' />
```

a live `onerror` handler. This is not only an injection question: real place names break it
too, because `L'Aquila`, `Val-d'Or` and `Martha's Vineyard` all contain an apostrophe that
ends the attribute. Values are escaped now, attributes are double-quoted, and URLs go through
a check that rejects any scheme other than `http`/`https`, since escaping does nothing about
`javascript:alert(1)`.

**The client could only ever talk to localhost.** `handlers/index.js` posted to
`http://localhost:8085/api/travels`, hardcoded, so a built bundle deployed anywhere could not
reach its own server. It posts to `/api/travels` now, which works in development and wherever
it is served from. That absolute URL is also what forced the next item.

**CORS was open to the entire internet.** `app.use(cors())` with no arguments sends
`Access-Control-Allow-Origin: *`. On a server whose only job is holding three API keys, that
means any page anywhere could spend the quota. It now allows only the origins named in
`CORS_ORIGIN`, and with none set it allows nothing cross-origin, which is all the bundled
client needs.

**Smaller things.**

- `app.js` called `path.resolve` without importing `path`, so `GET /` threw a `ReferenceError`
  whenever `NODE_ENV` was not `production`, which is to say under `npm run dev`.
- geonames was called over plain `http://`, putting the credential in the query string on the
  wire in clear text. It uses `https://secure.geonames.org/` now.
- `addMarkup` set `selectedElement.getElementsByClassName.display = 'none'` and back to
  `'block'`. `getElementsByClassName` is a method, so both lines set a property on a function
  object and did nothing; only the `removeChild` between them had any effect.
- The forecast printed `tempDate.getMonth()`, which is zero-based, so March showed as `2`.
- The port was hardcoded, and `server.on('error')` was missing, so an occupied port produced
  an unhandled event rather than a message.
- `webpack`, `webpack-cli` and `concurrently` were in `dependencies` rather than
  `devDependencies`, so a production install pulled the build toolchain.
- `.gitignore` gained logs, keys, `credentials*`, `secrets/` and local databases. The README
  pointed at `.env-sample`; the file is `.env-example`.

## Tests

There were none. `jest` was configured, `jest.setup.js` existed and `src/fixtures/index.js`
held fixture data, but the repository contained zero test files. Worse, `jest.config.js`
named `jest-html-reporter` in its `reporters` block, and that package is in **neither**
`package.json` nor `package-lock.json`. Jest resolves reporters before running anything, so
`npm test` could not start at all.

There are **63 tests** now, over seven suites, covering every fix above. Each one was
poison-tested: the fix was reverted and the suite checked to go red, so none of them passes
vacuously.

| reintroduced bug | tests that fail |
| --- | --- |
| stray digit in the latitude | 1 |
| `current/daily` instead of `current` | 1 |
| `validateResponse` returning `undefined` | 9 |
| removing the Express error middleware | 6 |
| `escapeHTML` removed from the `<h2>` | 1 |
| `safeURL` removed from the photo `src` | 2 |
| `escapeHTML` removed from the weather description | 1 |
| the forecast icon allowlist removed | 1 |
| `escapeHTML` removed from the days warning | 1 |
| allowing any URL scheme in `safeURL` | 2 |
| parser throwing on an empty response | 4 |

**The escaping helpers and their application are tested separately, because passing one does
not imply the other.** `escape.test.js` proves `escapeHTML` and `safeURL` behave; a reviewer
then removed `escapeHTML` from the `<h2>` and all tests still passed, because nothing
exercised `markup.js` itself. `markup.test.js` closes that by running `generateMarkup` and
inspecting the parsed DOM for inline event handlers and injected elements.

Getting that test right needed two payloads, and the first version of it was worthless with
one. A single-quote payload cannot break out of a double-quoted attribute, so with only
`x' onerror='...` the suite stayed green through four separate sink regressions. It now uses
`x" onerror="...` for attribute contexts and `<img src=x onerror="...">` for element content,
and every sink regression is caught.

One poison deliberately does *not* fail: reverting the attributes to single quotes while
keeping `escapeHTML`. That is correct rather than a gap, since `escapeHTML` escapes both `'`
and `"`, so either quoting style is safe once the value is escaped. The double quotes are
defence in depth, not the fix.

Three things about the setup are worth knowing before adding tests, because each cost time:

- `jest.mock(path)` with no factory does not work here. `jest-esm-transformer` compiles
  `export { a, b }` into read-only getters, so automocking yields plain values and
  `someExport.mockResolvedValue` is not a function.
- `jest.mock` calls are **not hoisted** above `import` statements, because
  `jest-esm-transformer` does not run `babel-plugin-jest-hoist`. `import app from '../app'`
  at the top of a file loads the real modules before the mocks apply. Measured: the route
  answered `404` for every case while `geoGetCityInfo.mock.calls.length` was `0`. Use
  `require` after the `jest.mock` calls.
- The API modules read their keys into module-level constants at import time, so a test must
  set `process.env.*` *before* requiring them. Otherwise the property check fails and the
  function returns before calling `fetch`, which is also what the app does in production when
  a key is missing.

Lint is clean now too; it was not. `npx eslint src` reported 3 errors on `master`.

## Running it

Three API keys are needed, all free:

1. [Geonames](http://www.geonames.org/export/web-services.html) — a username, not a key
2. [Weatherbit](https://www.weatherbit.io/account/create)
3. [Pixabay](https://pixabay.com/api/docs/)

Copy `.env-example` to `.env` and fill in the three values. `.env` is gitignored.

```shell
npm install

npm run dev            # webpack-dev-server plus the API server
npm test               # 51 tests
npm run lint
```

For production:

```shell
npm run prod:build
npm run prod:start     # PORT is honoured, defaulting to 8085
```

Optionally, if the bundle is served from a different origin than the API:

```shell
CORS_ORIGIN=https://your-site.example npm run prod:start
```

### Node 14 to 20. Not 22 or newer.

Two separate era limits, both measured rather than assumed.

**The build** needs a flag on Node 17+. Webpack 4 uses an MD4 hash that OpenSSL 3 removed, so
`npm run prod:build` fails with `ERR_OSSL_EVP_UNSUPPORTED`:

```shell
NODE_OPTIONS=--openssl-legacy-provider npm run prod:build
```

**The server has a hard ceiling.** These files use `import`/`export` in `.js` with no
`"type": "module"`, so they run through `-r esm`, and the `esm` package was last published in
2020. Measured, starting the server and requesting `GET /` and `POST /api/travels`:

| Node | result |
| --- | --- |
| 14, 16, 18, 20 | `Server listening`, `GET /` → **200**, `POST /api/travels {}` → **400** |
| 22, 24 | fails at startup inside `esm.js`: `TypeError: Function.prototype.apply was called on undefined` |

That is a dependency limit, not a code one, and the dependencies here are deliberately left
at their 2021 versions. Use Node 20 or below to run it; the tests themselves run on any
version, since jest does not go through `esm`.

## Not covered

- **No live API calls are exercised.** Every test mocks `node-fetch` or the API modules, so
  the URL construction and response handling are verified but the three services were never
  actually called. That would need real keys.
- **Dependencies are unchanged.** `webpack` 4, `jest` 26, `node-sass` 4 and `esm` 3 all stay
  where they were. The known advisories against them are left in place on purpose; upgrading
  would make this a different project rather than a fixed one.
- **`node-sass` 4.14.1 fails its own postinstall on some toolchains, and did so before this
  change.** Measured on `node:14-alpine` with python3/make/g++ installed: `npm ci` exits 1 at
  `node-sass@4.14.1 postinstall: node scripts/build.js`, and it does so identically on
  `master`, so it is not something introduced here. `npm ci --ignore-scripts` succeeds on both,
  installing the same 2060 packages. node-sass is a devDependency needed only to compile
  `.scss`, so the tests and the server run without it; the production build does not.
- **The service worker is unexamined.** `workbox-webpack-plugin` emits one and nothing here
  tests what it caches.
