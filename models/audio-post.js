var Value = require('@mmckegg/mutant/value')
var Struct = require('@mmckegg/mutant/struct')
var MutantSet = require('@mmckegg/mutant/set')

module.exports = AudioPost

var updateWhiteList = ['title', 'description', 'license', 'overview', 'duration', 'audioSrc', 'artworkSrc']

function AudioPost (id) {
  var result = Struct({
    timestamp: Value(),
    title: Value(),
    description: Value(),
    license: Value(),
    overview: Value(),
    duration: Value(0, {defaultValue: 0}),
    audioSrc: Value(),
    artworkSrc: Value(),
    likes: MutantSet(),
    reposters: MutantSet()
  })

  result._type = 'ferment/audio'
  result.id = id
  result.position = Value(0)
  result.state = Value()
  result.updateFrom = updateFrom.bind(null, result)
  result.author = null // set on init

  return result
}

function updateFrom (post, msg) {
  var c = msg.value.content
  if (msg.value.author === post.author.id) {
    updateWhiteList.forEach(k => {
      if (k in c) {
        post[k].set(c[k])
      }
    })
  }
}
