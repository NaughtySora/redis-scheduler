'use strict';

const modulePath = module => {
  for (const file of Object.keys(require.cache)) {
    const cached = require.cache[file];
    if (cached.exports === module) return file;
  }
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

module.exports = { modulePath, reject, STATUSES };
