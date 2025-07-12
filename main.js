"use strict";

const scheduler = require("./lib/scheduler/index.js");
const redis = require("redis");
const path = require("node:path");

const main = async () => {
  const client = redis.createClient();
  await client.connect();
  const KEY = "jobs";

  await client.zAdd(KEY, {
    score: Date.now(),
    value: JSON.stringify({ name: "log", params: ["test"] }),
  });

  await client.zAdd(KEY, {
    score: Date.now(),
    value: JSON.stringify({ name: "log", params: ["text-log"] }),
  });

  const { start, stop } = scheduler({
    path: path.resolve(__dirname, "./api.js"),
    options: { key: "jobs" },
    // batch: true,
  });
  await start();

  const exit = async () => {
    if (client.isOpen) await client.close();
    await stop();
  };

  process.on('SIGINT', async () => {
    await exit();
    console.error("Grateful exit");
    process.exit(0);
  });

  process.on("uncaughtException", async (error) => {
    await exit();
    console.error("Application closed with", error);
    process.exit(1);
  });
};

main();