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
    // batch: true,
  });
  await start();
};

main();