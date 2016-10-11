var h = require('./lib/h')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')
var Value = require('@mmckegg/mutant/value')
var electron = require('electron')
var processImage = require('./lib/process-image')

module.exports = function (client, config, data) {
  var context = {
    config,
    api: require('./api')(client, config)
  }

  var imageUrl = Value()
  var publishing = Value(false)

  var imageInput = h('input', {type: 'file', accept: 'image/*'})
  var displayName = h('input -name', {
    placeholder: 'Choose a display name',
    value: data.profile.displayName || ''
  })
  var description = h('textarea -description', {
    rows: 9,
    placeholder: 'Anything you want to say about yourself?',
    value: data.profile.description || ''
  })

  var defaultImage = data.profile.image && context.api.getBlobUrl(data.profile.image)

  imageInput.onchange = function () {
    var file = imageInput.files[0]
    if (file) {
      processImage(file.path, {
        width: 500, height: 500, type: 'jpeg'
      }, (err, url) => {
        if (err) throw err
        imageUrl.set(url)
      })
    }
  }

  setTimeout(() => {
    displayName.focus()
    displayName.select()
  }, 50)

  return h('Dialog', [
    h('section EditProfile', [
      h('div.image', {
        style: {
          'background-image': url(computed(imageUrl, p => p || defaultImage))
        }
      }, [
        h('span', ['🖼 Choose Profile Image...']), imageInput
      ]),
      h('div.main', [
        h('div.info', [
          displayName, description
        ])
      ])
    ]),
    h('footer', [
      when(publishing,
        h('button', {'disabled': true}, ['Publishing...']),
        [ h('button -save', {'ev-click': save}, ['Save Profile']),
          h('button -cancel', {'ev-click': cancel}, ['Cancel'])
        ]
      )
    ])
  ])

  // scoped

  function save () {
    publishing.set(true)
    var item = {}

    if (displayName.value !== (data.profile.displayName || '')) {
      item.name = displayName.value
    }

    if (description.value !== (data.profile.description || '')) {
      item.description = description.value
    }

    if (imageUrl()) {
      context.api.addBlob(imageUrl(), (err, hash) => {
        if (err) throw err
        console.log('added blob', hash)
        item.image = {
          link: hash
        }
        publish(item)
      })
    } else {
      publish(item)
    }
  }

  function publish (item) {
    console.log('publishing', item)
    if (Object.keys(item)) {
      item.type = 'about'
      item.about = data.id
      context.api.publish(item, function (err) {
        if (err) throw err
        var window = electron.remote.getCurrentWindow()
        window.close()
      })
    } else {
      cancel()
    }
  }

  function cancel () {
    var window = electron.remote.getCurrentWindow()
    window.close()
  }
}

function url (value) {
  return computed(value, (v) => v ? `url('${v}')` : '')
}
