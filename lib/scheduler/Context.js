"use strict";

const { abstract } = require("naughty-util");
const { fork } = require("node:child_process");
const { finalize, register } = require("../workersPool/noroutine.js");
const { createClient } = require("redis");

class Context {
  client = null;
  api = null;

  constructor(options, { path } = {}) {
    this.options = options;
    this.path = path;
  }

  async #connectClient() {
    const client = createClient(this.options)
      .on('error', async (err) => {
        await this.stop();
        console.log('redis client error', err);
      });
    this.client = client;
    await client.connect();
  }

  async start() {
    this.api = require(this.path);
    await this.#connectClient();
    return this;
  }

  async stop() {
    await this.client.quit();
    this.client = null;
    this.api = null;
  }
}

class ThreadContext extends Context {
  async start() {
    await super.start();
    const api = this.api;
    this.api = register({
      modules: { api },
      concurrency: 1,
    }).api;
  }

  async stop() {
    await finalize(this.api);
    this.api = null;
  }
}

class ProcessContext {

}

const getContext = abstract.factorify({
  process: ProcessContext,
  thread: ThreadContext,
}, Context);

module.exports = { getContext };