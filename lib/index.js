"use strict";

const { abstract } = require("naughty-util");
const monitor = require("./monitor.js");
const separated_process = require("./process.js");
const separated_thread = require("./thread.js");

const approach = abstract.factorify({
  process: separated_process,
  thread: separated_thread,
}, monitor);

module.exports = (parameters = {}) => approach(parameters.isolate)(parameters);
