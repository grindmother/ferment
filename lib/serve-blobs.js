var pull = require('pull-stream')
var cat = require('pull-cat')
var toPull = require('stream-to-pull-stream')
var ident = require('pull-identify-filetype')
var mime = require('mime-types')
var URL = require('url')
var http = require('http')

module.exports = function (context, cb) {
  return http.createServer(ServeBlobs(context.sbot)).listen(context.config.blobsPort, cb)
}

module.exports.handler = ServeBlobs
module.exports.serve = serve

function ServeBlobs (sbot) {
  return function (req, res, next) {
    var parsed = URL.parse(req.url, true)
    var hash = decodeURIComponent(parsed.pathname.slice(1))
    sbot.blobs.want(hash, function (_, has) {
      if (!has) return respond(res, 404, 'File not found')
      // optional name override
      if (parsed.query.name) {
        res.setHeader('Content-Disposition', 'inline; filename=' + encodeURIComponent(parsed.query.name))
      }

      // serve
      res.setHeader('Content-Security-Policy', BlobCSP())
      respondSource(res, sbot.blobs.get(hash), false)
    })
  }
}

function serve (sbot, id, res) {
  sbot.blobs.want(id, function (_, has) {
    if (!has) return respond(res, 404, 'File not found')
    res.setHeader('Content-Security-Policy', BlobCSP())
    respondSource(res, sbot.blobs.get(id), false)
  })
}

function respondSource (res, source, wrap) {
  if (wrap) {
    res.writeHead(200, {'Content-Type': 'text/html'})
    pull(
      cat([
        pull.once('<html><body><script>'),
        source,
        pull.once('</script></body></html>')
      ]),
      toPull.sink(res)
    )
  } else {
    pull(
      source,
      ident(function (type) {
        if (type) {
          res.writeHead(200, {
            'Content-Type': mime.lookup(type),
            'Cache-Control': 'max-age=31556926' // cache forever (well, 1 year)!
          })
        }
      }),
      toPull.sink(res)
    )
  }
}

function respond (res, status, message) {
  res.writeHead(status)
  res.end(message)
}

function BlobCSP () {
  return 'default-src none; sandbox'
}
