"use strict";
process.loadEnvFile(".env");
const { scheduler } = require("../main");
const { resolve } = require("node:path");
const { describe, it } = require("node:test");
const api = require('./api.js');
const { async } = require("naughty-util");

const KEY = "jobs";

const config = {
  password: process.env.REDIS_PASSWORD,
  port: parseInt(process.env.REDIS_PORT, 10),
};

describe("Scheduler", async () => {
  await it("main thread", async () => {
    const client = scheduler({
      key: KEY,
      interval: 1000,
      modules: { api },
    });
    client.on("error", console.error);
    await client.start(config);
    client.add(JSON.stringify({
      name: "api",
      key: "log",
      args: [],
    }));
    await async.pause(2000);
    await client.stop();
  });

  await it('thread', async () => {
    const client = scheduler({
      key: KEY,
      interval: 1000,
      modules: { api },
      isolate: "thread",
    });
    client.on("error", console.error);
    await client.start(config);
    client.add(JSON.stringify({
      name: "api",
      key: "log",
      args: [],
    }));
    await async.pause(2000);
    await client.stop();
  });

  await it('process', async () => {
    try {
      const client = scheduler({
        key: KEY,
        interval: 1000,
        modules: { api },
        isolate: "process",
      });
      client.on("error", console.error);
      await client.start(config);
      client.add(JSON.stringify({
        name: "api",
        key: "log",
        args: [],
      }));
      await async.pause(2000);
      await client.stop();
    } catch (e) {
      console.error(e);
    }
  });
});
