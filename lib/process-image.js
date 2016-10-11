module.exports = function (path, opts, cb) {
  var image = document.createElement('img')

  image.onload = next
  image.src = `file://${path}`
  image.style.display = 'block'

  if (image.complete) next()

  function next () {
    var imageHeight = image.height
    var imageWidth = image.width

    var multiplier = (opts.height / image.height)
    if (multiplier * imageWidth < opts.width) {
      multiplier = opts.width / image.width
    }

    var finalWidth = imageWidth * multiplier
    var finalHeight = imageHeight * multiplier

    var offsetX = (finalWidth - opts.width) / 2
    var offsetY = (finalHeight - opts.height) / 2

    var canvas = document.createElement('canvas')
    canvas.width = opts.width
    canvas.height = opts.height
    var ctx = canvas.getContext('2d')
    ctx.drawImage(image, -offsetX, -offsetY, finalWidth, finalHeight)
    var dataURL = canvas.toDataURL('image/' + opts.type)
    cb(null, dataURL)
  }
}
