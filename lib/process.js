"use strict";

const isMainProcess = process.channel === undefined;

if (isMainProcess) {
  module.exports = require("./adapters.js").ProcessAdapter.create;
} else {
  const options = JSON.parse(process.argv[2]);
  const monitor = require(path.resolve(__dirname, "./monitor.js"));
  const noop = () => { };
  const { start, stop } = monitor(options);

  const commands = abstract.factorify({
    stop: async () => {
      await stop();
      process.send({ status: "stop" });
      process.exit(0);
    },
    start: async () => {
      await start();
      process.send({ status: "start" });
    },
    error: async (error) => {
      await stop();
      process.send({ status: "error", details: { error } });
      process.exit(0);
    },
  }, noop);

  process.on("message", async (message) => {
    const status = message.status;
    if (typeof status !== "string") return;
    const command = commands(status);
    await command();
  });

  process.on("uncaughtException", commands("error"));
  process.on("SIGINT", noop);
}
