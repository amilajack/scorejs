'use strict';

var plugins = [
  require('./lib/plugins/time.js'),
  require('./lib/plugins/teoria.js'),
  require('./lib/plugins/chord-player.js')
];
var Score = require('./lib/score.js')(plugins);


if(window) window.Score = Score;
module.exports = Score;
