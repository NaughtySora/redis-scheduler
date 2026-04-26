"use strict";

const { resolve } = require("node:path");
const threads = require("node:worker_threads");

if (threads.isMainThread) {
  module.exports = require("./adapters.js").ThreadAdapter.create;
  return;
}

const { workerData, parentPort } = threads;

const create = require(resolve(__dirname, "./scheduler.js"));
const scheduler = create(workerData.options);

parentPort.on("message", async (message) => {
  const status = message.status;
  console.log(message);
  if (typeof status !== "string") return;
  if (status === "stop") {
    await stop(ms);
    process.exit(0);
  }
  if (status === "start") {
    await start(workerData.config);
    parentPort.postMessage({ status: "start" });
  }
  if (status === "add") {
    try {
      await scheduler.add(
        message.data.value,
        message.data.score
      );
    } catch (e) {
      parentPort.postMessage({ status: "error", error });
    }
  }
});
