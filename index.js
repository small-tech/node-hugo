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

  // Builds the Hugo source from sourcePath and writes the output at
  // destinationPath. Note that destinationPath is relevant to sourcePath
  // (don’t shoot me, this is a Hugo convention so I’m mirroring it for
  // consistency with regular Hugo usage). The returned result is the
  // object returned from the exec() call with stdout and stderr properties.
  async build (sourcePath = '.', destinationPath = 'public/') {
    const hugoBuildCommand = `${this.hugoBinaryPath} --source=${sourcePath} --destination=${destinationPath}`
    const options = {
      env: process.env
    }
    const result = await exec(hugoBuildCommand, options)

    if (result.stderr !== '') {
      // There was an error.
      throw new HugoError('Build failed', result.stderr)
    }

    return result.stdout
  }

  // Starts a Hugo server with defaults set for rendering to disk and using outside live reload.
  // (These are the defaults our current use case on Site.js).

  // hugo server --source=.hugo-source --destination=../.hugo-public --buildDrafts --renderToDisk --baseURL=https://localhost --disableLiveReload --appendPort=false

  serve (sourcePath, destinationPath, baseURL) {
    const args = [
      'server',
      `--source=${sourcePath}`,
      `--destination=${destinationPath}`,
      `--baseURL=${baseURL}`,
      '--buildDrafts',
      '--renderToDisk',
      '--disableLiveReload',
      '--appendPort=false',
    ]
    const options = { env: process.env, stdio: 'inherit' }
    const hugoServer = spawn(this.hugoBinaryPath, args, options)
    return hugoServer
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

    const hugoVersion = '0.64.0'

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

    try {
      const hugoBinaryBuffer = fs.readFileSync(hugoBinaryInternalPath, 'binary')
      fs.writeFileSync(hugoBinaryExternalPath, hugoBinaryBuffer, {encoding: 'binary', mode: 0o755})
    } catch (error) {
      throw new Error(` 🤯 [node-hugo] Panic: Could not copy Hugo binary to external directory: ${error.message}`)
    }

    return hugoBinaryExternalPath
  }
}


module.exports = Hugo
