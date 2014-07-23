#!/usr/bin/env node

/**
 * TypeScript single-file compiler:
 *
 *   $ node tsc.js < input.ts > output.js
 *
 * Avoids TypeScript attempting to compile an entire "project",
 * so that a proper `make` target can be written.
 */

var fs = require('fs');
var path = require('path');
var ts = require('typescript-api');

var file;
var filename;
if (process.argv[2]) {
  filename = process.argv[2];
  file = fs.createReadStream(filename);
} else {
  filename = '/dev/stdin';
  file = process.stdin;
}

var data = '';
file.setEncoding('utf8');
file.on('data', function (s) {
  data += s;
});
file.on('end', function () {
  var result = compileTs(filename, data);
  process.stdout.write(result);
});

function StderrLogger() {
}

StderrLogger.prototype.information = function() { return false; }

StderrLogger.prototype.debug = function() { return false; }

StderrLogger.prototype.warning = function() { return false; }

StderrLogger.prototype.error = function() { return false; }

StderrLogger.prototype.fatal = function() { return false; }

StderrLogger.prototype.log = function(s) {
  console.error(s);
}

function getTsSettings() {
  var st = new ts.CompilationSettings();
  st.codeGenTarget = 1; // EcmaScript 5
  st.moduleGenTarget = 1; // commonjs
  st.syntacticErrors = true;
  st.semanticErrors = false;
  return ts.ImmutableCompilationSettings.fromCompilationSettings(st);
}

function compileTs(file, data) {
  var logger = new StderrLogger();
  var settings = getTsSettings();
  var compiler = new ts.TypeScriptCompiler(logger, settings);

  var snapshot = ts.ScriptSnapshot.fromString(data);
  var lib = path.resolve(require.resolve('typescript'), '../lib.d.ts');
  var libSnapshot = ts.ScriptSnapshot.fromString(fs.readFileSync(lib, 'utf-8'));
  compiler.addFile(lib, libSnapshot);
  compiler.addFile(file, snapshot);

  var it = compiler.compile();
  var output = '';
  var result, ix, current;
  while (it.moveNext()) {
    result = it.current();
    for (ix = 0; ix < result.outputFiles.length; ix++) {
      current = result.outputFiles[ix];
      if (!current) { continue; }
      output += current.text;
    }
  }

  return output;
}
