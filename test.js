const test = require('tape')
const fs = require('fs-extra')
const http = require('http')

const hugo = new (require('./index'))()

async function httpGet (url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      const statusCode = response.statusCode
      const location = response.headers.location

      // Reject if it’s not one of the status codes we are testing.
      if (statusCode !== 200 && statusCode !== 404 && statusCode !== 500 && statusCode !== 302) {
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

test('[hugo-build] ', async t => {
  t.plan(3)

  const sourcePath = 'test/site'
  const destinationPath = '../public' /* NB. relative to source path */
  const baseURL = 'http://localhost:1313'

  if (fs.existsSync(destinationPath)) {
    fs.removeSync(destinationPath)
  }

  let hasError = false
  let output = null
  try {
    output = await hugo.build(sourcePath, destinationPath, baseURL)
  } catch (error) {
    hasError = true
  }

  t.false(hasError, 'does not throw an error')

  const deflatedOutput = output.replace(/\s/g, '')

  // Ensure build statistics are as we expect.
  t.true(deflatedOutput.includes('Pages|2Paginatorpages|0Non-pagefiles|1Staticfiles|0Processedimages|0Aliases|0Sitemaps|1Cleaned|0'), 'console output statistics are as expected')

  const deflatedIndexPageHTML = fs.readFileSync('test/public/index.html', 'utf-8').replace(/\s/g, '')

  const expectedDeflatedIndexPageHTML = '<!DOCTYPEhtml><htmllang="en"><head><metaname="generator"content="Hugo0.64.0"/><metacharset="UTF-8"><metaname="viewport"content="width=device-width,initial-scale=1.0"><title>Yes!</title></head><body><h1>Yes!</h1><p>node-hugo<strong>works!</strong></p></body></html>'

  // Ensure generated HTML is as we expect.
  t.strictEquals(expectedDeflatedIndexPageHTML, deflatedIndexPageHTML, 'index page HTML is as expected')
})


test('[hugo-serve] ', async t => {
  t.plan(9)

  const sourcePath = 'test/site'
  const destinationPath = '../public' /* NB. relative to source path */
  const baseURL = 'http://localhost:1313'

  if (fs.existsSync(destinationPath)) {
    fs.removeSync(destinationPath)
  }

  const hugoServerProcess = hugo.serve(sourcePath, destinationPath, baseURL)
  let hasError = false
  let hasWarning = false

  let builtInMessageShown = false
  let webServerMessageIsShown = false
  let pressCtrlCToStopMessageIsShown = false

  hugoServerProcess.stdout.on('data', (data) => {

    const lines = data.toString('utf-8').split('\n')

    lines.forEach(line => {
      const deflatedLine = line.replace(/\s/g, '')

      if (line.includes('WARN')) { hasWarning = true }
      if (line.includes('Built in')) { builtInMessageShown = true }
      if (line.includes('Web Server is available at http://localhost:1313/')) { webServerMessageIsShown = true }
      if (line.includes('Press Ctrl+C to stop')) { pressCtrlCToStopMessageIsShown = true } // last message once server is ready

      if (line.includes('Pages')) { t.strictEquals(deflatedLine, 'Pages|2', 'two pages are rendered') }
      if (line.includes('Non-page files')) { t.strictEquals(deflatedLine, 'Non-pagefiles|1', 'one non-page file is rendered') }
      if (line.includes('Sitemaps')) { t.strictEquals(deflatedLine, 'Sitemaps|1', 'one sitemap is rendered') }

    })
  })

  hugoServerProcess.stderr.on('data', (data) => {
    hasError = true
  })

  hugoServerProcess.on('close', (code) => {
    t.assert(true, 'server process is closed via kill()')
    t.false(hasError, 'server did not encounter an error')
    t.false(hasWarning, 'server did not encounter a warning')

    t.true(builtInMessageShown, 'server output included the “built in N ms” message')
    t.true(webServerMessageIsShown, 'server output included “web server is available” message')
    t.true(pressCtrlCToStopMessageIsShown, 'server output included “press CTRL+C to stop” message (last message in server launch)')

  })

  setTimeout(() => {
    // Stop the process.
    hugoServerProcess.kill()
  }, 250)
})
