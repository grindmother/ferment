#!/usr/bin/env node

var spawn = require('child_process').spawn
var electron = require('electron')
var join = require('path').join

if (process.argv.includes('--rebuild')) {
  spawn('npm', ['run', 'rebuild'], {
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  }).on('exit', function (i, m) {
    process.exit()
  })
} else {
  spawn(electron, ['index.js'].concat(process.argv.slice(2)), {
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  }).on('exit', function (i, m) {
    process.exit()
  })
}
