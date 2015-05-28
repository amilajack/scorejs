(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var pitch = require('note-pitch');

module.exports = function(Score) {

  Score.fn.transpose = function(interval ) {
    return this.transform(function(event) {
      var transposed = pitch.transpose(event.value, interval);
      if (transposed) {
        event.type = 'note';
        event.value = transposed;
      }
      return event;
    });
  }

  Score.fn.pitches = function() {
    return this.transform(function(event) {
      var p = pitch(event.value);
      if (p) {
        event.type = 'note';
        event.pitch = p;
      }
      return event;
    });
  }
}

},{"note-pitch":9}],2:[function(require,module,exports){
'use strict';

module.exports = function(Score) {
  /*
   * Return a sequence with the events between 'begin' and 'end'
   */
  Score.fn.region = function(begin, end) {
    return Score(this.sequence.filter(function(event) {
      return event.position >= begin && event.position < end;
    }));
  }
}

},{}],3:[function(require,module,exports){
'use strict';

module.exports = function(Score) {
  /*
   * Repeat a sequence 'times' times
   *
   * @param {Integer} times - the number of times to be repeated
   */
  Score.fn.repeat = function(times) {
    var duration = this.duration();
    return this.transform(function(event) {
      return range(times).map(function(i) {
        return Score.event(event, { position: event.position + duration * i });
      });
    });
  }

  /*
   * Delay
   *
   * Delay a sequence by a distance
   *
   * Params:
   * - distance: space between the event and the delayed event in ticks
   */
  Score.fn.delay = function(distance) {
    return this.transform(function(event) {
      event.position += distance;
      return event;
    });
  }
}

function range(number) {
  var array = [];
  for(var i = 0; i < number; i++) {
    array.push(i);
  }
  return array;
}

},{}],4:[function(require,module,exports){
'use strict';

var duration = require('note-duration');
var TimeMeter = require('time-meter');

/*
 * parseMeasures
 *
 * @params {String} measures - the string measures to be parsed
 * @params {String} time - the time signature (4/4 by default)
 * @returns {Array} - an array of obects with value and duration
 */
module.exports = function(measures, time) {
  if(Array.isArray(measures)) measures = measures.join('|');
  else if (typeof(measures) !== 'string')
    throw Error("String or Array expected in melody-parser");
  if(measures.indexOf('|') == -1) return null;

  time = time || "4/4";
  var meter = TimeMeter(time);
  return parseMeasures(meter, measures);
}

function parseMeasures(meter, repr) {
  var events = [];
  var position = 0;
  splitMeasures(repr).forEach(function(measure) {
    var items = measure.trim().split(' ');
    var length = meter.measure / items.length;
    items.forEach(function(i) {
      if(i === '/') {
        var last = events[events.length - 1];
        last.duration += length;
      } else {
        events.push({ value: i, position: position, duration: length });
      }
      position += length;
    });
  });
  return events;
}

function splitMeasures(repr) {
  return repr
    .replace(/\s+\||\|\s+/, '|') // spaces between |
    .replace(/^\||\|\s*$/g, '') // first and last |
    .split('|');
}

},{"note-duration":5,"time-meter":6}],5:[function(require,module,exports){
'use strict';

var names = ['long', 'double', 'whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirty-second'];
var values = [4,       2,       1,       1/2,    1/4,       1/8,      1/16,       1/32];

var namesToValues = {};
for(var i = 0; i < values.length; i++) {
  var name = names[i];
  var value = values[i];
  var short = name[0];
  var num = "" + (1 / value);
  namesToValues[name] = value;
  namesToValues[short] = namesToValues[num] = value;
  namesToValues[short + "."] = namesToValues[num + "."] = value + value / 2;
  namesToValues[short + ".."] = namesToValues[num + ".."] = value + value / 2 + value / 4;
}

var valuesToNames = {};
names.forEach(function(name, index) {
  var value = values[index];
  valuesToNames["" + value] = name[0];
  valuesToNames["" + (value + value / 2)] = name[0] + ".";
  valuesToNames["" + (value + value / 2 + value / 4)] = name[0] + "..";
});

var duration = function(name) {
  return namesToValues['' + name];
}

duration.toString = function(value) {
  return valuesToNames['' + value];
}

module.exports = duration;

},{}],6:[function(require,module,exports){
'use strict';

module.exports = TimeMeter;

function TimeMeter(meter) {
  if(!(this instanceof TimeMeter)) return new TimeMeter(meter);
  meter = meter.split('/');
  this.beats = +meter[0];
  this.subdivision = +meter[1]
  this.measure = this.beats / this.subdivision;
}

TimeMeter.prototype.toString = function () {
  return "" + this.beats + "/" + this.subdivision;
};

},{}],7:[function(require,module,exports){
'use strict';

var duration = require('note-duration');

module.exports = function(source, options) {
  options = options || {};
  var defaultDuration = duration(options.duration) || 0.25;
  var parser = options.parser || parseDuration;

  if(typeof(source) === 'string') {
    source = source.trim().split(' ');
  } else if (!Array.isArray(source)) {
    throw Error('Melody must be an string or an array.')
  }

  var seq = source.map(function(e) {
    return { value: e.value || e,
      position: e.position || 0, duration: e.duration || 0 };
  });

  var parsed, position = 0;
  seq.forEach(function(e) {
    parsed = parser(e.value, defaultDuration);
    if(parsed) {
      e.value = parsed[0]
      e.duration = +parsed[1];
    }
    e.position = position;
    position += e.duration;
  });
  return seq;
}

function parseDuration(value, defaultDuration) {
  var split = value.split('/');
  var dur = duration(split[1]);
  return dur ? [split[0], dur] : [value, defaultDuration ];
}

},{"note-duration":8}],8:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],9:[function(require,module,exports){
'use strict';

var Interval = require('interval-parser');
var Note = require('note-parser');

var SEMITONES = {c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
var pitch = function(note) {
  note = Note(note);
  var alter = note.accidentals.length;
  if(note.accidentals[0] === 'b') alter = -1 * alter;
  return SEMITONES[note.pitchClass] + alter + 12 * (note.octave + 1);
}

pitch.semitones = function(a, b) {
  return pitch(b) - pitch(a);
}

/*
 * pitch.distance
 *
 * return intervals between notes
 */
pitch.distance = function(root, notes) {
  root = Note(root);
  if(arguments.length == 1) {
    return function(note) {
      return interval(root, note);
    }
  } else if (Array.isArray(notes)) {
    return notes.map(function(i) {
      return interval(root, i);
    });
  } else {
    return interval(root, notes);
  }
}

pitch.transpose = function(note, interval) {
  if(arguments.length == 1) {
    interval = note;
    return function(note) {
      return transpose(note, interval);
    }
  } else if (Array.isArray(interval)) {
    return interval.map(function(i) {
      return transpose(note, i);
    });
  } else {
    return transpose(note, interval);
  }
}

var CHANGE = {
  'minor': ['d', 'm', 'M', 'A'],
  'perfect': ['d', 'P', 'A']
}
function interval(a, b) {
  a = Note(a);
  b = Note(b);
  var semitones = pitch.semitones(a, b);
  var dir = semitones < 0 ? -1 : 1;
  var pitchDistance = pitchDist(a, b) + dir;
  if(dir < 0) pitchDistance -= 7;

  var i = Interval("d" + pitchDistance);
  var octaves = semitones / 12 | 0;
  if (octaves == -1) octaves = 0;
  var difference = dir * (semitones - i.semitones - 12 * octaves);
  var dest = CHANGE[i.type][difference] + (pitchDistance + 7 * octaves);
  return dest;
}

function pitchDist(a, b) {
  var first = PITCH_CLASSES.indexOf(Note(a).pitchClass);
  var second = PITCH_CLASSES.indexOf(Note(b).pitchClass, first);
  return second - first;
}

function pitchNum(note) {
  var num = Note(note).pitchClass.charCodeAt(0);
  return (num < 99) ? num + 7 : num;
}

var PITCH_CLASSES = "cdefgabcdefgab";
var ACCIDENTALS = ['bb', 'b', '', '#', '##']
function transpose(note, interval) {
  note = Note(note);
  interval = Interval(interval);
  var pitchIndex = PITCH_CLASSES.indexOf(note.pitchClass);
  var pitchClass = PITCH_CLASSES[pitchIndex + interval.simple - 1];
  var dest = Note(pitchClass + (note.octave + interval.octaves));
  var difference = interval.semitones - (pitch(dest) - pitch(note));
  var reduced = difference % 12;
  var octaves = (difference - reduced) / 12;
  var accidentals = ACCIDENTALS[reduced + 2];
  return dest.pitchClass + accidentals + (dest.octave + octaves);
}

module.exports = pitch;

},{"interval-parser":10,"note-parser":11}],10:[function(require,module,exports){
'use strict';
/*
 * parseInterval
 *
 * Parse a interval and returns an object with:
 * - name
 * - quality
 * - direction
 * - number
 * - simple
 * - type
 * - semitones
 * - octaves
 */
var INTERVAL = /^([dmPMA])(-{0,1})(\d{1,2})$/;
function parseInterval(interval) {
  var obj = null;
  if(isIntervalObj(interval)) {
    obj = prepare(interval);
  } else if (typeof(interval) == 'string') {
    var m = INTERVAL.exec(interval.trim());
    if(m) {
      obj = prepare({name: interval, quality: m[1],
        direction: m[2], number: m[3]});
    }
  }
  return validate(interval, obj);
}

function validate(name, obj) {
  if(obj == null) {
    throw Error("Interval not valid: " + name);
  }
  return obj;
}


function isIntervalObj(interval) {
  return typeof(interval.name) !== 'undefined'
    && typeof(interval.quality) !== 'undefined'
    && typeof(interval.direction) !== 'undefined'
    && typeof(interval.number) !== 'undefined';
}

function prepare(i) {
  i.number = +i.number;
  i.direction = i.direction === '' ? 1 : -1;
  i.octaves = i.octaves || octaves(i);
  i.simple = i.simple || simpleNumber(i);
  i.type = i.type || type(i);
  i.semitones = i.semitones || semitones(i);
  if(/A1|d1|d2/.test(i.name)) i.direction = -1;
  return i;
}

function simpleNumber(i) {
  if(i.number > 8) {
    var num = (i.number - 1) % 7 + 1;
    if (num == 1) num = 8;
    return num;
  } else {
    return i.number;
  }
}

function octaves(i) {
  if(i.number === 1) return 0;
  else return Math.floor((i.number - 2) / 7);
}

 var SEMITONES = {"d1": -1, "d2": 0, "d3": 2, "d4": 4, "d5": 6,
   "d6": 7, "d7": 9, "d8": 11}
 var EXTRA = {
   "minor": {"d": 0, "m": 1, "M": 2, "A": 3 },
   "perfect": {"d": 0, "P": 1, "A": 2 }
 };

function semitones(i) {
  var semi = SEMITONES["d" + i.simple];
  var extra = EXTRA[i.type][i.quality];
  var oct = i.octaves * 12;
  return i.direction * (semi + extra + oct);
}


function type(i) {
  var num = i.simple;
  if(num === 1 || num === 4 || num === 5 || num === 8) {
    return "perfect";
  } else {
    return "minor";
  }
}

if (typeof module === "object" && module.exports) module.exports = parseInterval;
else i.parseInterval = parseInterval;

},{}],11:[function(require,module,exports){
'use strict';

var NOTE = /^([a-gA-G])(#{0,2}|b{0,2})(-?\d{0,1})$/
/*
 * parseNote
 *
 * @param {String} note - the note string to be parsed
 * @return {Object} a object with the following attributes:
 * - pitchClass: the letter of the note, ALWAYS in lower case
 * - accidentals: the accidentals (or '' if no accidentals)
 * - octave: the octave as integer. If not present in the string, its 2
 */
var parse = function(note, options) {
  if(typeof(note.pitchClass) !== 'undefined'
    && typeof(note.accidentals) !== 'undefined'
    && typeof(note.octave) !== 'undefined') {
    return note;
  }

  var match = NOTE.exec(note);
  if(match) {
    var octave = match[3] !== '' ? +match[3] : 2;
    return { pitchClass: match[1].toLowerCase(),
      accidentals: match[2], octave: octave };
  }
  throw Error("Invalid note format: " + note);
}

parse.toString = function(obj) {
  return obj.pitchClass + obj.accidentals + obj.octave;
}

module.exports = parse;

},{}],12:[function(require,module,exports){
'use strict';

var parseMeasures = require('measure-parser');
var parseMelody = require('melody-parser');

var identity = function(e) { return e; }

module.exports = function() {
  /*
   * Score
   *
   * @param {String | Array } source - the sequence source
   * @param {String} time [optional] - the time signature ("4/4" by default)
   * @param {Function} - the transformation function
   */
  function Score(source, time, transform) {
    if (!(this instanceof Score)) return new Score(source, time, transform);

    var hasTimeParam = (typeof(time) === 'string');
    this.time = hasTimeParam ? time : "4/4";

    if(typeof(source) === 'string') {
      this.sequence = parseMeasures(source, this.time) || parseMelody(source, this.time);
    } else if(Array.isArray(source)) {
      this.sequence = source.map(function(e) { return Score.event(e); });
    } else {
      throw Error('Unkown source format: ' + source);
    }
    transform = hasTimeParam ? transform : time;
    transform = transform || identity;
    var apply = (typeof(transform) == 'function') ? applyFunction : applyObj;
    apply(this, transform);
  }
  /*
   * applyFunction(private)
   * map -> flatten - > compact -> sort
   */
  function applyFunction(score, transform) {
    score.sequence = [].concat.apply([], score.sequence.map(transform))
      .filter(function(e) {
        return e != null;
      })
      .sort(function(a, b) {
        return a.position - b.position;
      });
  }
  function applyObj(score, obj) {
    var result = score;
    for(var name in obj) {
      if(!score[name]) {
        throw Error("Sequence doesn't have '" + name + "' method. Maybe forgot a plugin?");
      } else {
        result = result[name].call(result, obj[name]);
      }
    }
    score.sequence = result.sequence;
  }

  Score.event = function(e) {
    var evt = { value: e.value || e,
      position: e.position || 0, duration: e.duration || 0 };
    if(arguments.length !== 1) {
      // merge arguments
      for(var i = 1; i < arguments.length; i++) {
        var obj = arguments[i];
        for(var key in obj) {
          if(obj.hasOwnProperty(key)) {
            evt[key] = obj[key];
          }
        }
      }
    }
    return evt;
  }

  Score.merge = function() {
    var result = [];
    for(var i = 0, total = arguments.length; i < total; i++) {
      result = result.concat(arguments[i].sequence);
    }
    return new Score(result);
  }

  Score.concat = function() {
    var result = [], s, position = 0;
    for(var i = 0, total = arguments.length; i < total; i++) {
      s = arguments[i].transform(function (event) {
        event.position += position;
        return event;
      });
      result = result.concat(s.sequence);
      position += s.duration();
    }
    return new Score(result);
  }

  Score.prototype.transform = function(transform) {
    return new Score(this.sequence, transform);
  }

  Score.prototype.duration = function() {
    var last = this.sequence[this.sequence.length - 1];
    return last.position + last.duration;
  }

  Score.prototype.clone = function () {
    return new Score(this.sequence);
  };

  Score.prototype.merge = function() {
    var seqs = [this].concat(Array.prototype.slice.call(arguments));
    return Score.merge.apply(null, seqs);
  }

  Score.prototype.concat = function() {
    var seqs = [this].concat(Array.prototype.slice.call(arguments));
    return Score.concat.apply(null, seqs);
  }

  Score.fn = Score.prototype;
  Score.use = function(plugin) {
    plugin(Score);
  }

  return Score;
}

},{"measure-parser":4,"melody-parser":7}],13:[function(require,module,exports){
'use strict';

var Score = require('./score.js')();
Score.use(require('./core/time.js'));
Score.use(require('./core/musical.js'));
Score.use(require('./core/select.js'));
module.exports = Score;

},{"./core/musical.js":1,"./core/select.js":2,"./core/time.js":3,"./score.js":12}]},{},[13]);
