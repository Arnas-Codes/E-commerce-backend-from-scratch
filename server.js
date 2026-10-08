import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";
import https from "https";
import fs from "fs";

import redisClient from "./config/redis.js";

connectDB();

await redisClient.connect();
console.log("Redis connected");

const options = {
  key: fs.readFileSync("./cert/private-key.pem"),
  cert: fs.readFileSync("./cert/certificate.pem"),
};

const PORT = process.env.PORT || 3000;

https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS server is running on port ${PORT}`);
});
