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

test('[node-hugo] ', async t => {
  t.plan(1)

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

  t.false(hasError, '[hugo build] does not throw an error')

})

