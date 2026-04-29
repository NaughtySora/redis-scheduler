# Redis Scheduler
Should server as an example more than production version,
for production consider using sql database transaction
with locking and inbox patter.


```js
  const api = require("./some-api.js");
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
    args: [`log-${score}`],
  }));
  await client.stop();
```