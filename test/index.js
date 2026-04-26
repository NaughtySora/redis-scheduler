"use strict";
process.loadEnvFile(".env");
const scheduler = require("../main.js");
const { createClient } = require("redis");
const { resolve } = require("node:path");
const { describe, it } = require("node:test");
const api = require('./api.js');
const { async } = require("naughty-util");

const KEY = "jobs";

const config = {
  password: process.env.REDIS_PASSWORD,
  port: parseInt(process.env.REDIS_PORT, 10),
};

describe("Scheduler - Main Thread", async () => {
  await it("simple", async () => {
    const redis = createClient(config);
    const client = scheduler({
      key: KEY,
      interval: 1000,
      modules: { api },
    });
    client.on("error", console.error);
    await client.start(redis);
    client.add(JSON.stringify({
      name: "api",
      key: "log",
      args: [],
    }));
    await async.pause(2000);
    await client.stop();
  });
});
