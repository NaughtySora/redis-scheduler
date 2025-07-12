"use strict";

const { parentPort, workerData } = require("node:worker_threads");

const api = workerData.reduce((target, module) =>
  (target[module[0]] = require(module[1]), target), {});

parentPort.on("message", async ({ name, method, args }) => {
  try {
    const subroutine = api[name];
    const result = await subroutine[method](...args);
    parentPort.postMessage({ result });
  } catch (error) {
    parentPort.postMessage({ error });
  }
});