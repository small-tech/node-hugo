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


test('[hugo.command]', async t => {
  t.plan(4)

  const sourcePath = 'test/a-new-site'

  if (fs.existsSync(sourcePath)) {
    fs.removeSync(sourcePath)
  }

  const args = `new site ${sourcePath}`

  let hasError = false
  let output = null
  try {
    // Tell the built-in Hugo binary to create a new site at ./my-new-site/.
    output = await hugo.command(args)
  } catch (error) {
    hasError = true
  }

  t.false(hasError, 'does not throw an error')
  t.true(output.includes('Congratulations! Your new Hugo site is created'), 'new site is generated')
  t.true(fs.existsSync(sourcePath), 'generated site exists where we expect it')

  const generatedFiles = fs.readdirSync(sourcePath)
  t.true(generatedFiles.join(',') === 'archetypes,config.toml,content,data,layouts,static,themes', 'contents of generated site are as expected')
})


test('[hugo.build] ', async t => {
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

  const expectedDeflatedIndexPageHTML = '<!DOCTYPEhtml><htmllang="en"><head><metaname="generator"content="Hugo0.64.1"/><metacharset="UTF-8"><metaname="viewport"content="width=device-width,initial-scale=1.0"><title>Yes!</title></head><body><h1>Yes!</h1><p>node-hugo<strong>works!</strong></p></body></html>'

  // Ensure generated HTML is as we expect.
  t.strictEquals(expectedDeflatedIndexPageHTML, deflatedIndexPageHTML, 'index page HTML is as expected')
})


test('[hugo.serve] ', async t => {
  t.plan(5)

  const sourcePath = 'test/site'
  const destinationPath = '../public' /* NB. relative to source path */
  const baseURL = 'http://localhost:1313'

  if (fs.existsSync(destinationPath)) {
    fs.removeSync(destinationPath)
  }

  const {hugoServerProcess, hugoBuildOutput} = await hugo.serve(sourcePath, destinationPath, baseURL)

  hugoServerProcess.on('exit', (code) => {
    t.assert(true, 'server process exited via kill()')
    t.end()
  })

  hugoServerProcess.kill()

  const hugoBuildOutputDeflated = hugoBuildOutput.replace(/\s/g, '')

  t.false(hugoBuildOutputDeflated.includes('WARN'), 'build did not encounter a warning')
  t.true(hugoBuildOutputDeflated.includes('Pages|2'), 'two pages are rendered')
  t.true(hugoBuildOutputDeflated.includes('Non-pagefiles|1'), 'one non-page file is rendered')
  t.true(hugoBuildOutputDeflated.includes('Sitemaps|1'), 'one sitemap is rendered')
})


test('[hugo.version]', async t => {
  t.plan(1)

  const output = await hugo.command('version')
  const versionFromHugo = output.match(/v(\d+\.\d+\.\d+)-/)[1]

  t.strictEquals(hugo.version, versionFromHugo, 'Hugo version is correct.')
})
