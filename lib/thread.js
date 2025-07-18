"use strict";

const { abstract } = require("naughty-util");
const { isMainThread, Worker, workerData, parentPort } = require("node:worker_threads");
const path = require("node:path");

if (!isMainThread) {
  const monitor = require(path.resolve(__dirname, "./monitor.js"));
  const noop = () => { };
  const { start, stop } = monitor(workerData);

  const commands = abstract.factorify({
    stop: async () => {
      await stop();
      parentPort.postMessage({ status: "stop" });
      process.exit(0);
    },
    start: async () => {
      await start();
      parentPort.postMessage({ status: "start" });
    },
    error: async (error) => {
      await stop();
      parentPort.postMessage({ status: "error", details: { error } });
      process.exit(0);
    },
  }, noop);

  parentPort.on("message", async (message) => {
    const status = message.status;
    if (typeof status !== "string") return;
    const command = commands(status);
    await command();
  });

  process.on("uncaughtException", commands("error"));
  process.on("SIGINT", noop);
}

module.exports = (workerData) => {
  if (isMainThread) {
    let worker = null;
    return {
      async start() {
        worker = new Worker(__filename, { workerData });
        worker.on("online", () => {
          worker.postMessage({ status: "start" });
        });
      },
      stop(ms = 5000) {
        return new Promise((resolve, reject) => {
          let timer = setTimeout(reject, ms);
          worker.once("message", message => {
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
            if (message.status === "stop") (worker = null, resolve());
            else reject();
          });
          worker.postMessage({ status: "stop" });
        });
      },
    };
  };
  throw new Error("Scheduler main thread context was invoked in subprocess");
};