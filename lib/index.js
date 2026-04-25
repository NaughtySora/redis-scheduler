"use strict";

const { abstract } = require("naughty-util");
const { resolve } = require("node:path");

const approach = abstract.factorify({
  process: resolve(__dirname, "./process.js"),
  thread: resolve(__dirname, "./thread.js"),
}, resolve(__dirname, "./monitor.js"));

module.exports = (parameters = {}) =>
  require(approach(parameters.isolate))(parameters);
