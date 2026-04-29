"use strict";

const threads = require("node:worker_threads");

if (threads.isMainThread) {
  module.exports = require("./adapters.js").ThreadAdapter.create;
} else {
  const { resolve } = require("node:path");
  const { response, transformToApi } = require("./utils.js");
  const create = require(resolve(__dirname, "./scheduler.js"));
  const { workerData, parentPort } = threads;

  const modules = transformToApi(workerData.options.modules);

  const scheduler = create({
    key: workerData.options.key,
    interval: workerData.options.interval,
    modules,
  });

  const api = {
    async stop(message) {
      await scheduler.stop(message.data.ms);
      process.exit(0);
    },
    async start() {
      await scheduler.start(workerData.config);
      parentPort.postMessage(response("start"));
    },
    async add(message) {
      await scheduler.add(
        message.data.value,
        message.data.score
      );
    }
  };

  parentPort.on("message", async (message) => {
    const status = message.status;
    if (typeof status !== "string" || !Object.hasOwn(api, status)) return;
    try {
      await api[status](message);
    } catch (error) {
      parentPort.postMessage(response("error", error));
    }
  });
}
