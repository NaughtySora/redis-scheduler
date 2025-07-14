"use strict";

const { abstract } = require("naughty-util");
const { isMainThread, Worker, workerData, parentPort } = require("node:worker_threads");

if (!isMainThread) {
  const monitor = require("./monitor.js");
  const noop = async () => { };
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
      stop() {
        return new Promise((resolve, reject) => {
          worker.once("message", message => {
            if (message.status === "stop") resolve();
            else reject();
          });
          worker.postMessage({ status: "stop" });
        })
      },
    }
  };
  throw new Error("Scheduler main thread context was invoked in subprocess");
};