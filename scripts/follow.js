#!/usr/bin/env node

var config = require('../lib/ssb-config')('ferment')
var createClient = require('ssb-client')
var schemas = require('ssb-msg-schemas')
var mlib = require('ssb-msgs')

var id = process.argv[2]
var link = mlib.link(id, 'feed')

if (link) {
  createClient(config.keys, config, (err, client) => {
    if (err) throw err
    var follow = schemas.follow(id)
    follow.scope = config.friends.scope
    client.publish(follow, (err, msg) => {
      if (err) throw err
      console.log(msg)
      process.exit()
    })
  })
} else {
  console.log('You need to specify a feed id to unfollow.')
}
