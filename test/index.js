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

// test | types
// createClientPool
// createSentinel

describe("Scheduler", async () => {
  await it.skip("main thread", async () => {
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
});
