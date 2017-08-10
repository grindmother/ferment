var { Value, h, when, computed } = require('mutant')
var nest = require('depnest')
var Path = require('path')
var processImage = require('../../../process-image')
var AudioOverview = require('../../../../widgets/audio-overview')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'keys.sync.id': 'first',
  'feed.pull.mentions': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {

  return nest('page.html.render', function mentions (path) {
    if (path !== '/upload') return
    var id = api.keys.sync.id()
    var artworkUrl = Value()
    var defaultImage = null
    var editOverride = null
    var audioInfo = Value()
    var artworkInput = h('input', {type: 'file', accept: 'image/*'})

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

    var audioInput = h('input', {type: 'file', accept: 'audio/*'})
    var title = h('input -title', { placeholder: 'Choose a title' })
    var description = h('textarea -description', {
      rows: 5,
      placeholder: 'Describe your audio'
    })

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
        alert('attempting save')
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

    var audioInfo = Value()
    var waitingToSave = Value(false)
    var publishing = Value(false)
    var processing = computed(audioInfo, (info) => info && info.processing)
    var lastAutoTitle = title.value
    var cancelLastImport = null
    
    function cancelPost () {
      waitingToSave.set(false)
    }
    
    function cancel() {}

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
        alert('TODO: upload to IPFS')
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
    
    /*
    if (edit && edit.item) {
      description.value = edit.item.description
      title.value = edit.item.title
      defaultImage = edit.item.artworkSrc && context.api.getBlobUrl(edit.item.artworkSrc)
      editOverride = {
        type: 'ferment/update',
        update: edit.id
      }
    }
    */

    var overview = computed([audioInfo /*, edit */], (info, edit) => {
      return info.overview
      
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
          h('span', [' Choose Artwork...']), artworkInput
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
            h('span', [' Choose Audio File...']),
            audioInput
          ])
        ])
      ]),
      h('footer', [
        h('div.info', [
          h('strong', 'Tip: '),
          `Wait for the  status `, h('em', `before`), ` closing LolaShare to `,
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

    
    return 'hi'
    return api.feed.html.rollup(api.feed.pull.mentions(id), {
      bumpFilter: mentionFilter,
      displayFilter: mentionFilter
    })

    // scoped
    function mentionFilter (msg) {
      if (Array.isArray(msg.value.content.mentions)) {
        if (msg.value.content.mentions.some(mention => {
          return mention && mention.link === id
        })) {
          return 'upload'
        }
      }
    }
  })
}
