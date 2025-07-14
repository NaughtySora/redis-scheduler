"use strict";

const { abstract } = require("naughty-util");
const path = require("node:path");

const approach = abstract.factorify({
  process: path.resolve(__dirname, "./process.js"),
  thread: path.resolve(__dirname, "./thread.js"),
}, path.resolve(__dirname, "./monitor.js"));

module.exports = (parameters = {}) => {
  const path = approach(parameters.isolate);
  const module = require(path);
  return module(parameters);
};
