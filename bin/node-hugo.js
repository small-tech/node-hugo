#!/usr/bin/env node

//////////////////////////////////////////////////////////////////////
//
// node-hugo command-line interface (CLI).
//
// Copyright (c) 2020 Aral Balkan. All Rights Reserved.
// Licensed under AGPLv3 or later.
//
// Note: this CLI is not really useful; just use hugo directly :)
// ===== I built it to have an easy way to test the functionality
//       as I was building it. (node-hugo is useful when integrated
//       into an existing app, like Site.js – https://sitejs.org).
//
//////////////////////////////////////////////////////////////////////

(async function main () {
  const Hugo = require('../index.js')
  const hugo = new Hugo()

  const command = process.argv[2]

  if (command === 'build') {
    //
    // Hugo build.
    //
    const sourcePath = process.argv[3]
    const destinationPath = process.argv[4]
    if (!sourcePath || !destinationPath) {
      console.log('\nError: Build command requires <sourcePath> and <destinationPath> arguments')
      showUsage()
      process.exit(1)
    }

    console.log(`\n[node-hugo] Build. Source: ${sourcePath} Destination: ${destinationPath}\n`)

    let result
    try {
      result = await hugo.build(sourcePath, destinationPath)
    } catch (error) {
      console.log(error.message, error.output)
      exit(1)
    }

    // Build ok.
    const hugoOutput = result.split('\n')
    hugoOutput.forEach(line => {
      if (line.includes('WARN')) {
        line = ` ⚠ ${line}`
      }
      line = `[node-hugo] ${line}`
      console.log(line)
    })

  } else if (command === 'serve') {
    //
    // Start Hugo server.
    //
    const sourcePath = process.argv[3]
    const destinationPath = process.argv[4]
    const baseURL = process.argv[5]

    if (!sourcePath || !destinationPath || !baseURL) {
      console.log('\nError: Serve command requires <sourcePath>, <destinationPath>, and <baseURL> arguments')
      showUsage()
      process.exit(1)
    }

    // Logs the data returned from a child process’s stdout and stderr
    // to the console, prepending an extensible custom prefix to each line.
    function log (data, additionalPrefix = ' ') {
      const lines = data.toString('utf-8').split('\n')
      lines.forEach(line => console.log(`[node-hugo] [server]${additionalPrefix}${line}`))
    }

    console.log(`\n[node-hugo] Serve. Source: ${sourcePath} Destination: ${destinationPath} Base URL: ${baseURL}\n`)

    const hugoServerProcess = hugo.serve(sourcePath, destinationPath, baseURL)

    hugoServerProcess.stdout.on('data', (data) => {
      log(data)
    })

    hugoServerProcess.stderr.on('data', (data) => {
      log(data, ' [ERROR] ')
    })

    hugoServerProcess.on('close', (code) => {
      console.log('[node-hugo] [server] Hugo server process exited with code', code)
    })

  } else {
    //
    // Error.
    //
    console.log(`\nUnknown command (${command})`)
    showUsage()
  }
})()

function showUsage () {
  console.log('\nUsage: hugo <command> [args]')
  console.log('Supported commands: build, serve\n')
}
