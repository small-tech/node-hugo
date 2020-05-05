# Node Hugo

A basic cross-platform interface to the Hugo binary from Node.js that uses the 64-bit release binaries to support Linux, macOS, and Windows.

It should __just work™__ 🤞

## Installation

```sh
npm i @small-tech/node-hugo
```

## Usage

```js
const Hugo = require('@small-tech/node-hugo')

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

__(Version 1.2.0+)__ You can also run any Hugo command using the simple pass-through `command()` method:

```js
const Hugo = require('@small-tech/node-hugo')

(async function main () {

  const hugo = new Hugo()

  try {
    // Tell the built-in Hugo binary to create a new site at ./my-new-site/.
    await hugo.command('new site my-new-site')
  } catch (error) {
    console.log('There was an error creating the new site with Hugo'. error)
    return
  }

  console.log('Site build successful. Output:', hugo.output)
})()
```

__(Version 1.3.0+)__ For creating Hugo servers with an arbitrary argument string, you can use the `serverWithArgs()` method. This works like the blocking `command()` method but provides streaming output from the Hugo server.

__(Version 1.4.0+)__ You can retrieve the version of Hugo that’s bundled using the `version` property:

```js
const Hugo = require('@small-tech/node-hugo')
const hugo = new Hugo()
console.log(`Hugo version: ${hugo.version}`)
```

## Maintenance

### Update Hugo binaries

On Linux-esque operating systems (with Bash shell):

```sh
npm run update-hugo-bin
```

This will remove the current binaries, download the latest ones, and rename them properly.
