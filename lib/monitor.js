"use strict";

const { EventEmitter, once } = require("node:events");
const { createClient } = require("redis");

const connectClient = async (clientOptions) => {
  const client = createClient(clientOptions)
  await client.connect();
  return client;
};

module.exports = (parameters) => {
  const { path, clientOptions, options = {} } = Object.assign({}, parameters);
  const { interval = 1000, batch = false, key = "jobs" } = options;
  let api = null;
  let client = null;
  let timer = null;
  let exec = null;
  let ee = null;
  let stopping = false;
  let processing = false;

  const criteria = () => [key, 0, Date.now()];

  const parallel = async (jobs, search) => {
    const promises = jobs.map(json => {
      const { name, params } = JSON.parse(json);
      const fn = api[name];
      return fn(...params)
    });
    await Promise.all(promises);
    await client.zRemRangeByScore(...search);
  };

  const sequence = async (jobs) => {
    for (const job of jobs) {
      const { name, params } = JSON.parse(job);
      const fn = api[name];
      if (!fn) continue;
      await fn(...params);
      await client.zRem(key, job);
    }
  };

  const monitoring = async () => {
    const listener = async () => {
      if (stopping) {
        clearTimeout(timer);
        timer = null;
        return void ee.emit("stop");
      }
      const search = criteria();
      const jobs = await client.zRangeByScore(...search);
      if (jobs.length !== 0) {
        processing = true;
        await exec(jobs, search);
        processing = false;
      }
      if (timer) timer.refresh();
    };
    await listener();
    timer = setTimeout(listener, interval);
  };

  const stop = async () => {
    this.stopping = true;
    if (processing) await once(this, "stop");
    if (timer) clearTimeout(timer);
    await client.close();
    api = null;
    client = null;
    timer = null;
    ee = (ee.removeAllListeners(), null);
    exec = null;
    return this;
  };

  return {
    async start() {
      api = require(path);
      ee = new EventEmitter();
      client = await connectClient(clientOptions);
      client.on('error', async (error) => {
        await stop();
        console.log('Redis Client error, closed connection', error);
      });
      exec = (batch ? parallel : sequence);
      await monitoring();
      return this;
    },
    stop,
  };
};