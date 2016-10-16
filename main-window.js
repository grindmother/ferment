var h = require('./lib/h')
var Value = require('@mmckegg/mutant/value')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')
var send = require('@mmckegg/mutant/send')
var electron = require('electron')
var Player = require('./widgets/player')
var onceTrue = require('./lib/once-true')
var watch = require('@mmckegg/mutant/watch')
var MutantMap = require('@mmckegg/mutant/map')
var LatestUpdate = require('./lib/latest-update')
var sanitizeFileName = require('sanitize-filename')

var views = {
  discoveryFeed: require('./views/discovery-feed'),
  followingFeed: require('./views/following-feed'),
  profile: require('./views/profile'),
  post: require('./views/audio-post')
}

module.exports = function (client, config) {
  var api = require('./api')(client, config)
  var background = require('./models/background-remote')(config)
  var currentView = Value(['discoveryFeed'])

  var backHistory = []
  var forwardHistory = []
  var canGoForward = Value(false)
  var canGoBack = Value(false)

  var latestUpdate = LatestUpdate()
  window.latestUpdate = latestUpdate

  var actions = {
    openEditProfileWindow,
    openJoinPubWindow,
    editPost,
    saveFile (item, cb) {
      electron.remote.dialog.showSaveDialog(electron.remote.getCurrentWindow(), {
        title: 'Export Audio File',
        defaultPath: sanitizeFileName(`${item.author.displayName()} - ${item.title()}.mp3`),
        filters: [
          {name: 'MP3', extensions: ['mp3']}
        ]
      }, function (path) {
        if (path) {
          background.exportFile(item.audioSrc(), path, cb)
        } else {
          cb && cb(false)
        }
      })
    },
    viewProfile (id) {
      actions.setView('profile', id)
    },
    viewPost (id) {
      actions.setView('post', id)
    },
    setView: function (view, ...args) {
      var newView = [view, ...args]
      if (!isSame(newView, currentView())) {
        canGoForward.set(false)
        canGoBack.set(true)
        forwardHistory.length = 0
        backHistory.push([currentView(), mainElement.scrollTop])
        currentView.set(newView)
        mainElement.scrollTop = 0
      }
    }
  }

  background.stats(x => console.log(x))

  var profile = api.getOwnProfile()
  var discoveryFeed = api.getDiscoveryFeed()
  var suggestedProfiles = api.getSuggestedProfiles(15)
  var following = MutantMap(api.rankProfileIds(profile.following), id => api.getProfile(id))
  var followingFeed = api.getFollowingFeed()

  // hold these open
  watch(suggestedProfiles)
  watch(discoveryFeed)
  watch(followingFeed)

  var context = { config, api, background, actions, discoveryFeed, followingFeed, suggestedProfiles, following, profile, urlFor }
  var player = context.player = Player(context)

  var rootElement = computed(currentView, (data) => {
    if (Array.isArray(data) && views[data[0]]) {
      return views[data[0]](context, ...data.slice(1))
    }
  })

  var mainElement = h('div.main', [
    rootElement
  ])

  onceTrue(api.profilesLoaded, (value) => {
    if (!profile.displayName()) {
      // prompt use to set up profile the first time they open app
      openEditProfileWindow()
    }
  })

  return h('MainWindow', {
    classList: [ '-' + process.platform ]
  }, [
    h('div.top', [
      h('span.history', [
        h('a', {
          'ev-click': goBack,
          classList: [ when(canGoBack, '-active') ]
        }, '<'),
        h('a', {
          'ev-click': goForward,
          classList: [ when(canGoForward, '-active') ]
        }, '>')
      ]),
      h('span.nav', [
        h('a', {
          'ev-click': send(actions.setView, 'discoveryFeed'),
          classList: [ computed(currentView, (x) => x[0] === 'discoveryFeed' ? '-selected' : null) ]
        }, 'Discovery'),
        h('a', {
          'ev-click': send(actions.setView, 'followingFeed'),
          classList: [ computed(currentView, (x) => x[0] === 'followingFeed' ? '-selected' : null) ]
        }, 'Following')
      ]),
      h('span.appTitle', ['Ferment']),
      h('span', [
        h('a', {
          'ev-click': send(actions.viewProfile, api.id),
          title: 'Your Profile',
          classList: [ computed(currentView, (x) => x[0] === 'profile' && x[1] === api.id ? '-selected' : null) ]
        }, '😀'),
        h('a -profile', {href: '#', 'ev-click': openEditProfileWindow}, ['Edit Profile']),
        h('a -add', {href: '#', 'ev-click': openAddWindow}, ['+ Add Audio'])
      ])
    ]),
    when(latestUpdate,
      h('div.info', [
        h('a.message -update', { href: 'https://github.com/mmckegg/ferment/releases' }, [
          h('strong', ['🎉 Ferment ', latestUpdate, ' has been released.']), ' Click here for more info!'
        ])
      ])
    ),
    mainElement,
    h('div.bottom', [
      player.audioElement
    ])
  ])

  // scoped

  function goBack () {
    if (backHistory.length) {
      canGoForward.set(true)
      forwardHistory.push([currentView(), mainElement.scrollTop])
      var item = backHistory.pop()
      currentView.set(item[0])
      setTimeout(() => {
        mainElement.scrollTop = item[1]
      }, 50)
      canGoBack.set(backHistory.length > 0)
    }
  }

  function goForward () {
    if (forwardHistory.length) {
      backHistory.push([currentView(), mainElement.scrollTop])
      var item = forwardHistory.pop()
      currentView.set(item[0])
      setTimeout(() => {
        mainElement.scrollTop = item[1]
      }, 50)
      canGoForward.set(forwardHistory.length > 0)
      canGoBack.set(true)
    }
  }

  function openEditProfileWindow () {
    electron.ipcRenderer.send('open-edit-profile-window', {
      profile: profile.byMe(),
      id: api.id
    })
  }

  function openJoinPubWindow () {
    electron.ipcRenderer.send('open-join-pub-window')
  }

  function urlFor () {
    return '#'
  }
}

function editPost (opts) {
  if (opts.id && opts.item.type === 'ferment/audio') {
    electron.ipcRenderer.send('open-add-window', opts)
  }
}

function openAddWindow (opts) {
  electron.ipcRenderer.send('open-add-window')
}

function isSame (a, b) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false
      }
    }
    return true
  } else if (a === b) {
    return true
  }
}
