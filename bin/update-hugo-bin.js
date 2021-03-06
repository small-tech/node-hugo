#!/usr/bin/env node

const https = require('https')
const fs = require('fs-extra')
const childProcess = require('child_process')
const path = require('path')
const assert = require('assert')

async function secureGet (url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      const statusCode = response.statusCode
      const location = response.headers.location

      // Reject if it’s not one of the status codes we are testing.
      if (statusCode !== 200 && statusCode !== 302) {
        reject({statusCode})
      }

      let body = ''
      response.on('data', _ => body += _)
      response.on('end', () => {
        resolve({statusCode, location, body})
      })
    })
  })
}

async function secureStreamToFile (url, filePath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filePath)
    https.get(url, response => {
      response.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
      fileStream.on('error', error => {
        fs.unlinkSync(filePath)
        reject(error)
      })
    })
  })
}

// Compare two semver strings (nn.nn.nn) and return 0 if they’re equal,
// 1 if a > b and -1 if a < b.
function semverCompare (a, b) {
  const [aMajor, aMinor, aPatch] = a.split('.').map(string => parseInt(string))
  const [bMajor, bMinor, bPatch] = b.split('.').map(string => parseInt(string))

  const aIsGreaterThanB =
    (aMajor > bMajor)
    || (aMajor === bMajor && aMinor > bMinor)
    || (aMajor === bMajor && aMinor === bMinor && aPatch > bPatch)

  return (a === b) ? 0 : aIsGreaterThanB ? 1 : -1
}

;(async ()=> {
  console.log('')
  console.log(' Update hugo-bin script')
  console.log(' ══════════════════════')
  console.log('')

  // Get the version of the current release.
  const hugoBinariesDirectory = path.resolve(path.join(__dirname, '..', 'hugo-bin'))

  if (!fs.existsSync(hugoBinariesDirectory)) {
    console.log(' Error: No hugo-bin folder found. Exiting.\n')
    process.exit(1)
  }

  const currentHugoBinaries = fs.readdirSync(hugoBinariesDirectory)

  const currentHugoVersionMatch = currentHugoBinaries[0].match(/^hugo-v(\d+\.\d+\.\d+)-/)
  if (currentHugoVersionMatch === null) {
    console.log(' Error: Unable to ascertain current Hugo version. Exiting.\n')
    process.exit(1)
  }

  const currentHugoVersion = currentHugoVersionMatch[1]

  console.log(` Current Hugo version: ${currentHugoVersion}`)

  // Get the location of the latest release page.
  const latestHugoReleasesPage = await secureGet('https://github.com/gohugoio/hugo/releases/latest')

  assert (latestHugoReleasesPage.location !== undefined, 'Location must exist (302 redirect).')

  // Get the latest release page.
  const actualLatestReleasePage = await secureGet(latestHugoReleasesPage.location)

  assert(actualLatestReleasePage.location === undefined, 'Actual page should not be a redirect.')

  const page = actualLatestReleasePage.body

  const versionMatch = page.match(/href=\"\/gohugoio\/hugo\/releases\/tag\/v(\d+\.\d+\.\d+)\"/)

  assert(versionMatch !== null, 'Version should be found on page.')

  const latestHugoVersion = versionMatch[1]

  assert(latestHugoVersion !== undefined, 'Version capturing group should exist.')

  console.log(` Latest Hugo version : ${latestHugoVersion}\n`)

  switch(semverCompare(currentHugoVersion, latestHugoVersion)) {
    case 0:
      console.log('You already have the latest release version of Hugo included in node-hugo. Exiting.')
      process.exit()

    case 1:
      console.log('Warning: It appears you have a later version than the release version included. Exiting.')
      process.exit()
  }

  console.log(' Upgrading the binaries to the latest version…\n')

  // Delete and recreate the hugo-bin folder.
  fs.removeSync(hugoBinariesDirectory)
  fs.mkdirpSync(hugoBinariesDirectory)

  const hugoReleaseUrlPrefix = `https://github.com/gohugoio/hugo/releases/download/v${latestHugoVersion}`

  const latestHugoBinaries = [
    {
      platform: 'Linux AMD 64-bit',
      archiveName: `hugo_${latestHugoVersion}_Linux-64bit.tar.gz`,
      newBinaryName: `hugo-v${latestHugoVersion}-linux-amd64`
    },
    {
      platform: 'Linux ARM',
      archiveName: `hugo_${latestHugoVersion}_Linux-ARM.tar.gz`,
      newBinaryName: `hugo-v${latestHugoVersion}-linux-arm`
    },
    {
      platform: 'Linux ARM64',
      archiveName: `hugo_${latestHugoVersion}_Linux-ARM64.tar.gz`,
      newBinaryName: `hugo-v${latestHugoVersion}-linux-arm64`
    },
    {
      platform: 'Darwin (masOS) AMD 64-bit',
      archiveName: `hugo_${latestHugoVersion}_macOS-64bit.tar.gz`,
      newBinaryName: `hugo-v${latestHugoVersion}-darwin-amd64`
    },
    {
      platform: 'Windows AMD 64-bit',
      archiveName: `hugo_${latestHugoVersion}_Windows-64bit.zip`,
      newBinaryName: `hugo-v${latestHugoVersion}-windows-amd64.exe`
    }
  ]

  for (hugoBinary of latestHugoBinaries) {
    const hugoBinaryArchiveUrl = `${hugoReleaseUrlPrefix}/${hugoBinary.archiveName}`

    console.log(` ${hugoBinary.platform}`)
    console.log(` ${'─'.repeat(hugoBinary.platform.length)}`)

    console.log('   ├ Downloading archive…')

    const binaryArchiveRedirectUrl = (await secureGet(hugoBinaryArchiveUrl)).location
    const binaryArchivePath = path.join(hugoBinariesDirectory, hugoBinary.archiveName)
    await secureStreamToFile(binaryArchiveRedirectUrl, binaryArchivePath)

    console.log('   ├ Unarchiving…')

    // Unarchive the downloaded archives and rename the files.
    if (hugoBinary.archiveName.endsWith('.zip')) {
      // Extract the Hugo binary.
      childProcess.execSync(`unzip ${binaryArchivePath} hugo.exe`, {env: process.env, cwd: hugoBinariesDirectory})

      // Rename the Hugo binary.
      const oldFilePath = path.join(hugoBinariesDirectory, 'hugo.exe')
      const newFilePath = path.join(hugoBinariesDirectory, hugoBinary.newBinaryName)
      fs.renameSync(oldFilePath, newFilePath)
    } else {
      // Extract the Hugo binary.
      childProcess.execSync(`tar -zxf ${binaryArchivePath} hugo`, {env: process.env, cwd: hugoBinariesDirectory})

      // Rename the Hugo binary.
      const oldFilePath = path.join(hugoBinariesDirectory, 'hugo')
      const newFilePath = path.join(hugoBinariesDirectory, hugoBinary.newBinaryName)
      fs.renameSync(oldFilePath, newFilePath)
    }

    console.log('   ├ Deleting archive…')

    // Delete the archive.
    fs.unlinkSync(binaryArchivePath)

    console.log(`   ╰ Upgraded to ${hugoBinary.newBinaryName}\n`)
  }

  console.log(' Done.\n')
})()
