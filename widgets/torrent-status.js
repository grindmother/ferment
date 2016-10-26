var prettyBytes = require('prettier-bytes')
var h = require('../lib/h')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')

module.exports = TorrentStatusWidget

function TorrentStatusWidget (context, infoHash) {
  return computed(infoHash, function (infoHash) {
    var torrentStatus = context.background.getTorrentStatus(infoHash)
    var others = when(torrentStatus.complete, torrentStatus.complete, torrentStatus.numPeers)
    return h('div.status', [
      when(torrentStatus.seeding, [
        when(torrentStatus.isDownloading,
          h('span', [computed(torrentStatus.progress, percent)])
        ),

        when(torrentStatus.downloadSpeed, [
          h('span', [ computed(torrentStatus.downloadSpeed, value => `${prettyBytes(value || 0)}/s 🔽`) ])
        ]),

        when(torrentStatus.uploadSpeed, [
          h('span', [ computed(torrentStatus.uploadSpeed, value => `${prettyBytes(value || 0)}/s 🔼`) ])
        ]),

        when(torrentStatus.solo, [
          h('span', {title: 'No one else has this file yet. Looking for peers...'}, [
            h('strong', 'Waiting to share 💖')
          ])
        ], [
          when(others, [
            h('span -peers', {
              title: 'Other people have this file'
            }, [
              h('strong', [others]),
              when(torrentStatus.complete, ' 🍻', ' 🍐')
            ])
          ], [
            h('span', [h('strong', 'Finding peers'), ' 🍐'])
          ])
        ])

      ], [
        when(torrentStatus.loading, [
          'Loading info...'
        ])
      ])
    ])
  })
}

function percent (value) {
  return Math.round(value * 100) + '%'
}
