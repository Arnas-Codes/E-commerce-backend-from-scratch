import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import https from "https";
import fs from "fs";
import redisClient from "./config/redis.js";

try {
  await connectDB();
  console.log("MongoDB connected");

  await redisClient.connect();
  console.log("Redis connected");
} catch (error) {
  console.error("Startup failed:", error.message);
  process.exit(1);
}

const options = {
  key: fs.readFileSync("./cert/private-key.pem"),
  cert: fs.readFileSync("./cert/certificate.pem"),
};

const PORT = process.env.PORT || 3000;

https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS server is running on port ${PORT}`);
}); 