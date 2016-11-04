var MutantSet = require('@mmckegg/mutant/set')

var cache = null

module.exports = function (sbot, config) {
  if (cache) {
    return cache
  } else {
    var result = MutantSet([], {nextTick: true})
    // todo: make this clean up on unlisten

    refresh()
    setInterval(refresh, 10e3)

    cache = result
    return result
  }

  // scope

  function refresh () {
    sbot.local.list((err, keys) => {
      if (err) throw console.log(err)
      result.set(keys)
    })
  }
}
