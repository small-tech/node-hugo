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

  // Start Hugo server. Returns a ChildProcess instance.
  const hugoServerProcess = hugo.createServer(optionalPathToHugoConfiguration)

  hugoServerProcess.on('error', (error) => {
    console.log('Hugo server encountered an error', error)
  })

  hugoServerProcess.stdout.on('data', (data) => {
    console.log(`[Hugo] ${data}`)
  })

  hugoServerProcess.stderr.on('data', (data) => {
    console.log(`[Hugo] [ERROR] ${data}`)
  })

  hugoServerProcess.on('close', (code) => {
    console.log('Hugo server process exited with code', code)
  })

  // Close the server after 5 seconds.
  setTimeout(() => {
    hugoServerProcess.kill()
  }, 5000)

})()
```

## Maintenance

### Update Hugo binaries

On Linux-esque operating systems (with Bash shell):

```sh
npm run update-hugo-bin
```

This will remove the current binaries, download the latest ones, and rename them properly.
