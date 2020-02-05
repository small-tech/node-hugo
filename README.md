# node-hugo

A basic cross-platform interface to the Hugo binary from Node.js that:

  * Uses the 64-bit release binaries to support Linux, macOS, and Windows.

It should __just work™__ 🤞

## Installation

```sh
npm i @small-tech/node-hugo
```

## Usage

```js
const Hugo = require('node-hugo')

(async function main () {

  const optionalPathToHugoConfiguration = 'optional/path/to/hugo/configuration/'

  const hugo = new Hugo()

  // Run a build.
  try {
    await hugo.build(optionalPathToHugoConfiguration)
  } catch (error) {
    console.log('There was an error building the site with Hugo'. error)
    return
  }

  console.log('Site build successful. Output:', hugo.output)

  // Start Hugo server.
  const hugoServer = hugo.createServer(optionalPathToHugoConfiguration)

  hugoServer.on('error', (error) => {
    console.log('Hugo server encountered an error', error)
  })

  hugoServer.on('output', (newOutput) => {
    console.log(`[Hugo] ${newOutput}`)
  })

  hugoServer.on('stop', (code) => {
    console.log('Hugo server closed with code', code)
  })

  await hugoServer.start()

  // Close the server after 5 seconds.
  setTimeout(() => {
    hugoServer.stop()
  }, 5000)

})()
```
