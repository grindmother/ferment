var extend = require('xtend')
var Path = require('path')
var ffmpeg = 'ffmpeg'
var env = extend(process.env)

if (process.platform === 'darwin') {
  ffmpeg = Path.join(__dirname, '..', 'bin', 'ffmpeg-darwin')
}

if (process.platform === 'linux' && process.arch === 'x64') {
  ffmpeg = Path.join(__dirname, '..', 'bin', 'ffmpeg-linux-x64')
}

if (process.platform === 'win32' && process.arch === 'x64') {
  ffmpeg = Path.join(__dirname, '..', 'bin', 'ffmpeg.exe')
}

console.log('using ', ffmpeg)

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

module.exports.spawn = function (args, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = null
  }
  return childProcess.spawn(ffmpeg, args, extend({
    env, encoding: 'buffer', cwd: process.cwd()
  }, opts))
}
