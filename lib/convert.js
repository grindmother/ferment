var ffmpeg = require('./exec-ffmpeg')

module.exports = function (input, output, cb) {
  ffmpeg([
    '-i', input,
    '-codec:a', 'libvorbis',
    '-qscale:a', 8,
    output
  ], cb)
}
