'use strict';

const modulePath = module => {
  for (const file of Object.keys(require.cache)) {
    const cached = require.cache[file];
    if (cached.exports === module) return file;
  }
};

const modulePaths = (modules) => {
  const paths = [];
  for (const entry of Object.entries(modules)) {
    paths.push({ name: entry[0], path: modulePath(entry[1]) });
  }
  return paths;
};

const reject = async (ms, error) => {
  await async.pause(ms);
  throw (error ?? new Error('Reject timeout'));
};

const STATUSES = Object.freeze([
  "init",
  "running",
  "stopping",
  "stopped",
]);

module.exports = {
  modulePath, modulePaths,
  reject, STATUSES
};
