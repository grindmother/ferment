var ffmpeg = require('./exec-ffmpeg')

module.exports = function (input, output, cb) {
  ffmpeg([
    '-i', input,
    '-vn', // remove video if any
    '-codec:a', 'libopus',
    '-b:a', '128k', // this is just an average - opus uses VBR by default
    output
  ], cb)
}

module.exports.mp3 = function (input, output, cb) {
  ffmpeg([
    '-i', input,
    '-vn', // remove video if any
    '-codec:a', 'libmp3lame',
    '-qscale:a', 7, // fairly low quality VBR, but this is just a fallback option
    output
  ], cb)
}

module.exports.export = function (input, output, cb) {
  ffmpeg([
    '-y', // overwrite existing file
    '-i', input,
    '-vn', // remove video if any
    '-codec:a', 'libmp3lame',
    '-qscale:a', 2, // High quality MP3 - since we're exporting from the opus version
    output
  ], cb)
}
