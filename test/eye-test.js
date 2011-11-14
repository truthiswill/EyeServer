var vows = require('vows'),
    should = require('should'),
    fs = require('fs'),
    SpawnAsserter = require('./spawn-asserter');
var eye = require('../eye.js');

vows.describe('Eye').addBatch({
  'The eye module': {
    topic: function() { return eye; },
    
    'should be a function': function (eye) {
      eye.should.be.a('function');
    },
    
    'should make Eye objects': function (eye) {
      eye().constructor.should.eql(eye);
      eye().should.be.an.instanceof(eye);
    },
    
    'should be an Eye constructor': function (eye) {
      new eye().constructor.should.eql(eye);
      new eye().should.be.an.instanceof(eye);
    },
    
    'should have a pass function': function (eye) {
      eye.pass.should.be.a('function');
    },
    
    'should have an execute function': function (eye) {
      eye.execute.should.be.a('function');
    }
  },
  'An Eye instance': {
    'when executed without arguments':
      shouldExecuteEyeWith(null,
                           "with 'nope'",
                           ['--nope']),
    
    'when executed with nope to false':
      shouldExecuteEyeWith({ nope: false },
                           "without 'nope'",
                           []),
    
    'when executed with one data URI':
      shouldExecuteEyeWith({ data: 'http://ex.org/1' },
                           "with one data URI",
                           ['--nope', 'http://ex.org/1']),
    
    'when executed with multiple data URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://ex.org/2'] },
                           "with multiple data URIs",
                           ['--nope', 'http://ex.org/1', 'http://ex.org/2']),
    
    'when executed with localhost URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://localhost/2', 'https://localhost/3'] },
                           "without the localhost URIs",
                           ['--nope', 'http://ex.org/1']),
    
    'when executed with 127.0.0.1 URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://127.0.0.1/2', 'https://127.0.0.1/3'] },
                           "without the 127.0.0.1 URIs",
                           ['--nope', 'http://ex.org/1']),
    
    'when executed with ::1 URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://::1/2', 'https://::1/3'] },
                           "without the ::1 URIs",
                           ['--nope', 'http://ex.org/1']),
    
    'when executed with file URIs':
       shouldExecuteEyeWith({ data: ['http://ex.org/1', 'file://example/'] },
                            "without the file URIs",
                            ['--nope', 'http://ex.org/1']),
    
    'when executed with an inexisting URI':
      shouldExecuteEyeWith({ data: ['http://ex.org/doesnotexist'] },
                           "with the URI",
                           ['--nope', 'http://ex.org/doesnotexist'],
                           null, null,
                           "** ERROR ** Message",
                           "Message"),
    
    'when executed with literal data':
      shouldExecuteEyeWith({ data: ':a :b :c.' },
                           'with a temporary file',
                           function (args) {
                             args.length.should.eql(2);
                             args[1].should.match(/^\/tmp\//$);
                             fs.readFileSync(args[1], 'utf8').should.eql(':a :b :c.');
                             args.should.eql(['--nope', args[1]]);
                           },
                           '</tmp/node_12345_0/0.tmp#a> </tmp/node_12345_0/0.tmp#b> </tmp/node_12345_0/0.tmp#c>.',
                           ':a :b :c.'),
  }
}).export(module);

function executeEyeWith(options, errorText, outputText) {
  return function () {
    var spawner = new SpawnAsserter(),
        eyeInstance = new eye({spawn: spawner.spawn }),
        callback = this.callback;
    
    spawner.once('ready', function() {
      errorText && spawner.stderr.emit('data', errorText);
      outputText && spawner.stdout.emit('data', outputText);
      spawner.emit('exit');
    });
    
    return eyeInstance.execute(options, function (err, result) {
      callback(err, result, spawner);
    });
  };
}

function shouldExecuteEyeWith(options, description, expectedArgs, output, expectedOutput, error, errorMessage) {
  var context = {
    topic: executeEyeWith(options, error, error ? null : (output || "output"))
  };

  context['should execute eye ' + description] = function (err, result, spawner) {
    spawner.command.should.eql('eye');
    if(typeof(expectedArgs) !== 'function')
      spawner.args.should.eql(expectedArgs);
    else
      expectedArgs(spawner.args);
  }
  
  if(!error)
    context['should return the eye output'] = function (err, result) {
      should.not.exist(err);
      result.should.equal(expectedOutput || "output");
    };
  else
    context['should return the eye error'] = function (err, result) {
      err.should.equal(errorMessage);
      should.not.exist(result);
    };
  
  return context;
}
