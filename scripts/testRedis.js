import redisClient from "../config/redis.js";

const run = async () => {
  await redisClient.connect();

  await redisClient.set("test:name", "Arnas");

  const value = await redisClient.get("test:name");

  console.log("Redis value:", value);

  await redisClient.quit();
};

run();