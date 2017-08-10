var { Value, h, when, computed } = require('mutant')
var nest = require('depnest')
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
    var audioInput = h('input', {type: 'file', accept: 'audio/*'})
    var title = h('input -title', { placeholder: 'Choose a title' })
    var description = h('textarea -description', {
      rows: 5,
      placeholder: 'Describe your audio'
    })
    
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

    function save () {}
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
          }/*, [
            AudioOverview(overview, 600, 100),
            h('span', [' Choose Audio File...']),
            audioInput
          ]*/)
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
