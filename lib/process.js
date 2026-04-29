"use strict";

const isMainProcess = process.channel === undefined;
if (isMainProcess) {
  module.exports = require("./adapters.js").ProcessAdapter.create;
} else {
  const { resolve } = require("node:path");
  const { response, transformToApi } = require("./utils.js");
  const create = require(resolve(__dirname, "./scheduler.js"));
  const data = JSON.parse(process.argv[2]);

  const modules = transformToApi(data.options.modules);

  const scheduler = create({
    key: data.options.key,
    interval: data.options.interval,
    modules,
  });

  const api = {
    stop: async (message) => {
      await scheduler.stop(message.data.ms);
      process.exit(0);
    },
    start: async () => {
      await scheduler.start(data.config);
      process.send(response("start"));
    },
    add: async (message) => {
      await scheduler.add(
        message.data.value,
        message.data.score
      );
    },
  };

  process.on("message", async (message) => {
    const status = message.status;
    if (typeof status !== "string" || !Object.hasOwn(api, status)) return;
    try {
      await api[status](message);
    } catch (error) {
      process.send(response("error", error));
    }
  });

  process.on("SIGINT", () => { });
}
