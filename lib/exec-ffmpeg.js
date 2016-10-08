var extend = require('xtend')
var fs = require('fs')
var ffmpeg = 'ffmpeg'
var env = extend(process.env)

if (process.platform === 'darwin') {
  var paths
  try {
    paths = fs.readFileSync('/etc/paths', 'utf8')
  } catch (ex) {}
  if (paths) {
    env.PATH = paths.split('\n').join(':')
  }
}

var childProcess = require('child_process')

module.exports = function (args, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = null
  }
  childProcess.execFile(ffmpeg, args, extend({
    env, maxBuffer: 1024 * 1024 * 16, encoding: 'buffer', cwd: process.cwd()
  }, opts), cb)
}
