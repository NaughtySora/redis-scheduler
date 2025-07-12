"use strict";

const isObject = entity => typeof entity === "object"
  && entity !== null
  && !Array.isArray(entity);

class Subroutine {
  constructor({ module, api }, pool) {
    for (const entry of Object.entries(api)) {
      const name = entry[0];
      Object.defineProperty(this, name, {
        value(...args) {
          return pool.execute(module, name, ...args);
        }
      })
    }
  }
}

const createApi = meta => {
  const resources = [];
  function Api(pool) {
    this.pool = pool;
    for (const entry of resources) {
      const name = entry[0];
      const Subroutine = entry[1];
      Object.defineProperty(this, name, { value: new Subroutine(pool), });
    }
  }
  for (const entry of Object.entries(meta)) {
    const api = entry[1];
    if (!isObject(api)) throw new Error("Module should return an object api");
    const module = entry[0];
    resources.push([module, Subroutine.bind(null, { module, api })]);
  }
  return Api;
};

module.exports = createApi;