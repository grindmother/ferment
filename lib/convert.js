var ffmpeg = require('./exec-ffmpeg')

module.exports = function (input, output, cb) {
  ffmpeg([
    '-i', input,
    '-codec:a', 'libopus',
    '-b:a', '128k',
    output
  ], cb)
}
