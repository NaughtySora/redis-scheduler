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


// process.on('SIGINT', async () => {
//   try {
//     await client.stop();
//     console.log("Grateful exit");
//     process.exit(0);
//   } catch (e) {
//     console.error("Error while exiting", e);
//     process.exit(1);
//   }
// });
// process.on("uncaughtException", async (error) => {
//   await exit();
//   console.error("Application closed with", error);
//   process.exit(1);
// });