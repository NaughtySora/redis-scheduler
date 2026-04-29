# Redis Scheduler
Server purpose of as example only.  

For production especially for multi-instance applications consider using SQL database with locks and inbox pattern.


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
