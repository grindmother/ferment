var MutantStruct = require('@mmckegg/mutant/struct')
var Value = require('@mmckegg/mutant/value')
var computed = require('@mmckegg/mutant/computed')

module.exports = TorrentStatus

function TorrentStatus (infoHash) {
  var result = MutantStruct({
    progress: Value(0),
    downloadSpeed: Value(0, {defaultValue: 0}),
    uploadSpeed: Value(0, {defaultValue: 0}),
    numPeers: Value(0),
    complete: Value(0),
    uploaded: Value(0),
    downloaded: Value(0),
    seeding: Value(false),
    loading: Value(false),
    saving: Value(false)
  })

  result.infoHash = infoHash
  result.isDownloading = computed([result.progress], progress => progress < 1)

  result.active = computed([result.loading], (loading) => {
    return !loading
  })

  result.solo = computed([result.progress, result.complete], (progress, complete) => {
    return progress === 1 && complete === 1
  })

  result.done = computed([result.progress], (progress) => {
    return progress === 1
  })

  return result
}
