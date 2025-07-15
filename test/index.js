"use strict";

const scheduler = require("../lib/index.js");
const redis = require("redis");
const path = require("node:path");

const KEY = "jobs";

const main = async () => {
  const client = redis.createClient();
  await client.connect();

  const { start, stop } = scheduler({
    path: path.resolve(__dirname, "./api.js"),
    options: { key: KEY, interval: 1000 },
    
  });

  await start();

  const timer = setTimeout(async () => {
    const score = Date.now();
    await client.zAdd(KEY, {
      score,
      value: JSON.stringify({ name: "log", params: [`log-${score}`] }),
    });
    timer.refresh();
  }, 1000);

  const exit = async () => {
    clearTimeout(timer);
    if (client.isOpen) await client.close();
    await stop();
  };

  process.on('SIGINT', async () => {
    await exit();
    console.log("Grateful exit");
    process.exit(0);
  });

  process.on("uncaughtException", async (error) => {
    await exit();
    console.error("Application closed with", error);
    process.exit(1);
  });
};

main();
