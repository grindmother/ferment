var h = require('./lib/h')
var electron = require('electron')
var Path = require('path')
var AudioOverview = require('./widgets/audio-overview')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')
var Value = require('@mmckegg/mutant/value')
var convert = require('./lib/convert')
var generateMeta = require('./lib/generate-meta')
var parseTorrentFile = require('parse-torrent-file')
var createTorrent = require('create-torrent')
var fs = require('fs')
var extend = require('xtend')
var sanitizeFileName = require('sanitize-filename')
var processImage = require('./lib/process-image')
var util = require('util')

// TODO: rewrite all of this with less callback hell. Maybe pull streams?

module.exports = function (client, config, edit) {
  var context = {
    config,
    api: require('./api')(client, config),
    background: require('./models/background-remote')(config)
  }

  var announce = config.webtorrent.announceList

  var mediaPath = config.mediaPath
  var artworkUrl = Value()

  var artworkInput = h('input', {type: 'file', accept: 'image/*'})
  var audioInput = h('input', {type: 'file', accept: 'audio/*'})
  var title = h('input -title', { placeholder: 'Choose a title' })
  var description = h('textarea -description', {
    rows: 5,
    placeholder: 'Describe your audio'
  })

  setTimeout(() => {
    title.focus()
    title.select()
  }, 50)

  var audioInfo = Value()
  var waitingToSave = Value(false)
  var publishing = Value(false)
  var processing = computed(audioInfo, (info) => info && info.processing)
  var lastAutoTitle = title.value
  var cancelLastImport = null

  audioInput.onchange = function () {
    var file = audioInput.files[0]
    if (file) {
      if (!title.value || title.value === lastAutoTitle) {
        var fileName = file.name
        var ext = Path.extname(fileName)
        var base = Path.basename(fileName, ext)
        title.value = base
        lastAutoTitle = title.value
      }

      audioInfo.set({ processing: true })

      cancelLastImport && cancelLastImport()
      cancelLastImport = prepareAudio(file.path, function (err, info) {
        if (err) {
          electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), {
            type: 'error',
            title: 'Error',
            buttons: ['OK'],
            message: 'An error occured while processing audio file. Please check that the file is a supported format.',
            detail: ffmpegError(err)
          })
          audioInfo.set({error: err})
          console.log(err)
          electron.remote.getGlobal('console').log(util.inspect(err))
        }
        audioInfo.set(info)
        if (waitingToSave()) {
          save()
        }
      })
    }
  }

  artworkInput.onchange = function () {
    var file = artworkInput.files[0]
    if (file) {
      processImage(file.path, {
        width: 500, height: 500, type: 'jpeg'
      }, (err, url) => {
        if (err) throw err
        artworkUrl.set(url)
      })
    }
  }

  var defaultImage = null
  var editOverride = null

  if (edit && edit.item) {
    description.value = edit.item.description
    title.value = edit.item.title
    defaultImage = edit.item.artworkSrc && context.api.getBlobUrl(edit.item.artworkSrc)
    editOverride = {
      type: 'ferment/update',
      update: edit.id
    }
  }

  var overview = computed([audioInfo, edit], (info, edit) => {
    if (info) {
      return info.overview
    } else if (edit && edit.item) {
      return edit.item.overview
    }
  })

  return h('Dialog', [
    h('section AddAudioPost', [
      h('div.artwork', {
        style: {
          'background-image': computed([artworkUrl, defaultImage], (url, defaultImage) => {
            if (url || defaultImage) {
              return `url('${url || defaultImage}')`
            } else {
              return ''
            }
          })
        }
      }, [
        h('span', ['🖼 Choose Artwork...']), artworkInput
      ]),
      h('div.main', [
        h('div.info', [
          title, description
        ]),
        h('div.audio', {
          classList: [
            when(processing, '-processing')
          ]
        }, [
          AudioOverview(overview, 600, 100),
          h('span', ['📂 Choose Audio File...']),
          audioInput
        ])
      ])
    ]),
    h('footer', [
      h('div.info', [
        h('strong', 'Tip: '),
        `Wait for the 🍻 status `, h('em', `before`), ` closing LolaShare to `,
        h('a', {
          href: 'https://github.com/LolaShare/LolaShare/#publishing-audio'
        }, `make sure other people get your file`), `.`
      ]),
      when(publishing,
        h('button', {'disabled': true}, ['Publishing...']),
        when(waitingToSave, [
          h('button', {'disabled': true}, ['Processing, please wait...']),
          h('button -stop', {'ev-click': cancelPost}, ['Cancel Post'])
        ], [
          h('button -save', {'ev-click': save}, [editOverride ? 'Save' : 'Publish Audio']),
          h('button -cancel', {'ev-click': cancel}, ['Cancel'])
        ])
      )
    ])
  ])

  // scoped

  function cancelPost () {
    waitingToSave.set(false)
  }

  function save () {
    if (audioInfo() && !audioInfo().error) {
      if (audioInfo().processing) {
        waitingToSave.set(true)
        return
      }
    } else if (!editOverride) {
      electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), {
        type: 'info',
        title: 'Cannot Publish',
        buttons: ['OK'],
        message: 'You need to choose an audio file before publishing.'
      })
      return
    }

    publishing.set(true)

    var item = extend({
      type: 'ferment/audio',
      title: title.value,
      description: description.value
    }, editOverride)

    if (audioInfo()) {
      commitAndSeed(extend(audioInfo(), item), next)
    } else {
      next(null, item)
    }

    function next (err, item) {
      if (err) throw err
      if (artworkUrl()) {
        context.api.addBlob(artworkUrl(), (err, hash) => {
          if (err) throw err
          console.log('added blob', hash)
          item.artworkSrc = `blobstore:${hash}`
          publish(item)
        })
      } else {
        publish(item)
      }
    }
  }

  function commitAndSeed (info, cb) {
    var baseName = sanitizeFileName(info.title.trim()) || 'audio'
    var tempDir = info.tempDir

    var tempFile = Path.join(tempDir, info.fileName)
    var newFileName = `${baseName}.webm`
    var renamed = Path.join(tempDir, newFileName)

    var fallbackTempFile = Path.join(tempDir, info.fallbackFileName)
    var newFallbackFileName = `${baseName}.mp3`
    var fallbackRenamed = Path.join(tempDir, newFallbackFileName)

    info = extend(info, {
      fileName: newFileName,
      fallbackFileName: newFallbackFileName
    })

    delete info.tempDir

    console.log('renaming', tempFile, 'to', renamed)
    fs.rename(tempFile, renamed, function (err) {
      if (err) return cb(err)
      fs.rename(fallbackTempFile, fallbackRenamed, function (err) {
        if (err) return cb(err)
        createTorrent([renamed, fallbackRenamed], { announce, name: baseName }, function (err, torrentFile) {
          if (err) return cb(err)
          var torrent = parseTorrentFile(torrentFile)
          var torrentPath = Path.join(mediaPath, `${torrent.infoHash}.torrent`)
          var containerPath = Path.join(mediaPath, `${torrent.infoHash}`)
          var finalPath = Path.join(containerPath, baseName)
          console.log('created torrent', torrentPath)
          fs.mkdir(containerPath, (err) => {
            if (err) return cb(err)
            fs.rename(audioInfo().tempDir, finalPath, (err) => {
              if (err) return cb(err)
              fs.writeFile(torrentPath, torrentFile, (err) => {
                if (err) return cb(err)
                context.background.seedTorrent(torrent.infoHash, function (err, magnetURI) {
                  if (err) throw err
                  console.log('seeding torrent', magnetURI)
                  info.audioSrc = magnetURI
                  cb(null, info)
                })
              })
            })
          })
        })
      })
    })
  }

  function publish (item) {
    console.log('publishing', item)
    context.api.publish(item, function (err) {
      if (err) throw err
      var window = electron.remote.getCurrentWindow()
      window.close()
    })
  }

  function cancel () {
    var window = electron.remote.getCurrentWindow()
    window.close()
  }

  function prepareAudio (path, cb) {
    var cancelled = false

    generateMeta(path, function (err, meta) {
      if (cancelled) return
      if (err) return cb && cb(err)
      console.log('generated meta', meta)
      var tempDir = Path.join(mediaPath, `importing-${Date.now()}`)
      fs.mkdir(tempDir, function (err) {
        if (err) return cb && cb(err)
        var fileName = `${Path.basename(path)}.webm`
        var toPath = Path.join(tempDir, fileName)
        var fallbackFileName = `${Path.basename(path)}.mp3`
        var toPathFallback = Path.join(tempDir, fallbackFileName)
        convert(path, toPath, function (err) {
          if (cancelled) return
          if (err) return cb && cb(err)
          console.log('converted to webm')
          // create an mp3 fallback for mobile platforms and browsers that don't support the future
          convert.mp3(path, toPathFallback, function (err) {
            if (cancelled) return
            if (err) return cb && cb(err)
            console.log('created fallback mp3 version')
            cb(null, extend(meta, {
              fileName, fallbackFileName, tempDir
            }))
          })
        })
      })
    })

    return () => {
      cancelled = true
    }
  }
}

function ffmpegError (err) {
  if (err.message) {
    var lines = err.message.trim().split('\n')
    return lines.slice(-3).join('\n')
  }
}
