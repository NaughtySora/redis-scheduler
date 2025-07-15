"use strict";

const { abstract } = require("naughty-util");
const { fork } = require("node:child_process");
const path = require("node:path");

const isMainProcess = process.channel === undefined;

if (!isMainProcess) {
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

module.exports = (options) => {
  if (isMainProcess) {
    let channel = null;
    let stopping = false;
    return {
      async start() {
        channel = fork(__filename, [JSON.stringify(options)]);
        channel.send({ status: "start" });
      },
      stop(ms = 5000) {
        return new Promise((resolve, reject) => {
          if (stopping) return void resolve();
          let timer = setTimeout(reject, ms);
          stopping = true;
          channel.on("message", message => {
            if (message.status !== "stop") return;
            channel = null;
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
            stopping = false;
            resolve();
          });
          channel.send({ status: "stop" });
        });
      },
    };
  };
  throw new Error("Scheduler subprocess has entered main context");
};
