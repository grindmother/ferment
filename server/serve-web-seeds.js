var ecstatic = require('ecstatic')

module.exports = ServeWebSeeds

function ServeWebSeeds (sbot, config) {
  return ecstatic({
    baseDir: '~seeds',
    root: config.mediaPath
  })
}
