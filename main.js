"use strict";

const { abstract } = require("naughty-util");
const { resolve } = require("node:path");

const approach = abstract.factorify({
  process: resolve(__dirname, "./lib/process.js"),
  thread: resolve(__dirname, "./lib/thread.js"),
}, resolve(__dirname, "./lib/scheduler.js"));

module.exports = {
  scheduler: (options = {}) =>
    require(approach(options.isolate))(options),
};

