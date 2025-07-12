"use strict";

const { getContext } = require("./Context.js");
const Monitor = require("./Monitor.js");

module.exports = ({ path, clientOptions, isolate, options } = {}) => {
  const Context = getContext(isolate);
  const context = new Context(clientOptions, { path });
  const monitor = new Monitor(context, options);
  return {
    start: monitor.start.bind(monitor),
    stop: monitor.stop.bind(monitor),
  };
};
