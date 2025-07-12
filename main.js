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
    value: JSON.stringify({ name: "test", params: [] }),
  });
  await client.zAdd(KEY, {
    score: Date.now(),
    value: JSON.stringify({ name: "test33", params: [] }),
  });

  // await client.set("test-persist", "test");
  // console.log(await client.get("test-persist"));
  const { start, stop } = scheduler({
    path: path.resolve(__dirname, "./api.js"),
  });
  await start();
};

main();