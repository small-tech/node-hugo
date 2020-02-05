#!/usr/bin/env node

(async function main () {
  const Hugo = require('../index.js')
  const hugo = new Hugo()

  const command = process.argv[2]
  if (command === 'build') {
    const sourcePath = process.argv[3]
    const destinationPath = process.argv[4]
    if (!sourcePath || !destinationPath) {
      console.log('\nError: Build command requires <sourcePath> and <destinationPath> arguments')
      showUsage()
      process.exit(1)
    }
    console.log(`[Hugo] Build. Source: ${sourcePath} Destination: ${destinationPath}`)

    const result = hugo.build(sourcePath, destinationPath)

    console.log(result)
  } else if (command === 'serve') {
    console.log('serve (todo)', process.argv[3])
  } else {
    console.log(`\nUnknown command (${command})`)
    showUsage()
  }
})()

function showUsage () {
  console.log('\nUsage: hugo <command> [args]')
  console.log('Supported commands: build, serve\n')
}
