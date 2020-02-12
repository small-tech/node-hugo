const os = require('os')
const path = require('path')
const fs = require('fs-extra')

const util = require('util')
const childProcess = require('child_process')

const exec = util.promisify(childProcess.exec)
const spawn = childProcess.spawn

const homeDir = os.homedir()

class HugoError extends Error {
  constructor (message, output) {
    super(message)
    this.sdterr = output
    this.name = 'HugoError'
  }
}

class Hugo {
  constructor (nodeHugoDir = path.join(homeDir, '.small-tech.org', 'node-hugo')) {

    this.machine = {
      platform: os.platform(),
      architecture: os.arch()
    }

    this.nodeHugoDir = nodeHugoDir

    // Ensure the node-hugo directory exists.
    fs.ensureDirSync(nodeHugoDir)

    this.hugoBinaryPath = this.hugoBinaryForThisMachine()
  }

  //
  // Public.
  //

  // Runs a generic, blocking Hugo command using the passed arguments.
  async command (args) {
    const hugoCommand = `${this.hugoBinaryPath} ${args}`
    const options = {
      env: process.env,
      stdio: 'pipe',
    }
    const result = await exec(hugoCommand, options)

    if (result.stderr !== '') {
      // There was an error.
      throw new HugoError(`Hugo command failed (arguments: ${args})`, result.stderr)
    }

    return result.stdout
  }

  // Builds the Hugo source from sourcePath and writes the output at
  // destinationPath. Note that destinationPath is relevant to sourcePath
  // (don’t shoot me, this is a Hugo convention so I’m mirroring it for
  // consistency with regular Hugo usage). The returned result is the
  // object returned from the exec() call with stdout and stderr properties.
  async build (sourcePath = '.', destinationPath = 'public/', baseURL = 'http://localhost:1313') {
    const hugoBuildCommand = `--source=${sourcePath} --destination=${destinationPath} --baseURL=${baseURL}`
    return await this.command(hugoBuildCommand)
  }

  // Starts a Hugo server with defaults set for rendering to disk and using outside live reload.
  // (These are the defaults our current use case on Site.js).
  //
  // Returns an object that contains a promise that’s resolved to an object with the following
  // properites once the initial Hugo build is complete:
  //
  //   - a referenece to the hugo server process
  //   - the hugo output so far
  //
  serve (sourcePath = '.', destinationPath = 'public/', baseURL = 'http://localhost:1313') {
    const args = [
      'server',
      `--source=${sourcePath}`,
      `--destination=${destinationPath}`,
      `--baseURL=${baseURL}`,
      '--buildDrafts',
      '--renderToDisk',
      '--disableLiveReload',
      '--appendPort=false',
      '--disableFastRender'
    ]
    return this.serverWithArgs(args)
  }

  // Starts a generic Hugo server
  serverWithArgs (args) {
    // Args should be an array. Automatically convert an arguments string to one.
    if (typeof args === 'string') {
      args = args.split(' ')
    }
    const options = { env: process.env }
    const hugoServerProcess = spawn(this.hugoBinaryPath, args, options)

    const hugoServerPromise = new Promise((resolve, reject) => {
      // Wait for the line telling us that the build is complete and that
      // the server is ready and only then return.

      let hugoBuildOutput = ''
      let buildComplete = false

      const stdoutHandler = (data) => {
        const lines = data.toString('utf-8').split('\n')

        lines.forEach(line => {
          hugoBuildOutput += `\n${line}`

          if (line.startsWith('Built in')) {
            // The site has been built. Let’s resolve the promise.
            buildComplete = true
          }
        })

        if (buildComplete) {
          // Clean up. If the consumer wants to, they can add their own to the
          // hugo server process instance that we will return.
          hugoServerProcess.stdout.removeAllListeners()
          hugoServerProcess.stderr.removeAllListeners()

          // OK.
          resolve({
            hugoServerProcess,
            hugoBuildOutput
          })
        }
      }

      const stderrHandler = (data) => {
        const errorMessage = data.toString('utf-8')
        reject(errorMessage)
      }

      hugoServerProcess.stdout.on('data', stdoutHandler)
      hugoServerProcess.stderr.on('data', stderrHandler)
    })

    return hugoServerPromise
  }

  //
  // Private.
  //

  // Returns the Hugo binary for this machine (platform + architecture) and
  // throws an error if there isn’t one for it.
  //
  // Note: this expects the Hugo binaries to be manually renamed prior to being
  // ===== added to the hugo-bin folder. The naming convention we use is the same
  //       as the one we use in the nodecert project for the mkcert binaries.
  hugoBinaryForThisMachine () {
    const platformMap = {
      linux: 'linux',
      darwin: 'darwin',
      win32: 'windows'
    }

    const architectureMap = {
      arm: 'arm',
      x64: 'amd64'
    }

    const platform = platformMap[this.machine.platform]
    const architecture = architectureMap[this.machine.architecture]

    if (platform === undefined) throw new Error('Unsupported platform', this.machine.platform)
    if (architecture === undefined) throw new Error('Unsupported architecture', this.machine.architecture)

    const hugoVersion = '0.64.1'

    const hugoBinaryName = `hugo-v${hugoVersion}-${platform}-${architecture}`
    const hugoBinaryRelativePath = path.join('hugo-bin', hugoBinaryName)
    let hugoBinaryInternalPath = path.join(__dirname, hugoBinaryRelativePath)

    if (platform === 'windows') hugoBinaryInternalPath += '.exe'

    // Check if the platform + architecture combination is supported.
    if (!fs.existsSync(hugoBinaryInternalPath)) throw new Error(`[node-hugo] Unsupported platform + architecture combination for ${platform}-${architecture}`)

    // Copy the Hugo binary to the external node-hugo directory so that we can call execSync() on it if
    // the app using this module is wrapped into an executable using Nexe (https://github.com/nexe/nexe) – like
    // Site.js (https://sitejs.org) is, for example. We use readFileSync() and writeFileSync() as
    // Nexe does not support copyFileSync() yet (see https://github.com/nexe/nexe/issues/607).
    const hugoBinaryExternalPath = path.join(this.nodeHugoDir, hugoBinaryName)

    if (!fs.existsSync(hugoBinaryExternalPath)) {
      try {
        const hugoBinaryBuffer = fs.readFileSync(hugoBinaryInternalPath, 'binary')
        fs.writeFileSync(hugoBinaryExternalPath, hugoBinaryBuffer, {encoding: 'binary', mode: 0o755})
      } catch (error) {
        throw new Error(` 🤯 [node-hugo] Panic: Could not copy Hugo binary to external directory: ${error.message}`)
      }
    }

    return hugoBinaryExternalPath
  }
}

module.exports = Hugo
