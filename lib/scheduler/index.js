"use strict";

const { abstract } = require("naughty-util");
const main_process = require("./main_process.js");
const separated_process = require("./separated_process.js");
const separated_thread = require("./separated_thread.js");

const approach = abstract.factorify({
  process: separated_process,
  thread: separated_thread,
}, main_process);

module.exports = (parameters = {}) => approach(parameters.isolate)(parameters);
