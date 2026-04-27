"use strict";

const threads = require("node:worker_threads");

if (threads.isMainThread) {
  module.exports = require("./adapters.js").ThreadAdapter.create;
} else {
  const { resolve } = require("node:path");
  const create = require(resolve(__dirname, "./scheduler.js"));
  const { workerData, parentPort } = threads;

  const modules = workerData.options.modules.reduce((acc, current) =>
    (acc[current.name] = require(current.path), acc), {});

  const scheduler = create({
    key: workerData.options.key,
    interval: workerData.options.interval,
    modules,
  });

  const command = (status, error = null, data = null) =>
    ({ status, error, data });

  const api = {
    async stop(message) {
      await scheduler.stop(message.data.ms);
      process.exit(0);
    },
    async start() {
      await scheduler.start(workerData.config);
      parentPort.postMessage(command("start"));
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
      parentPort.postMessage(command("error", error));
    }
  });
}
