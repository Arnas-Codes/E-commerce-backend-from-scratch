import net from "node:net";
import { afterEach, expect, it, vi } from "vitest";

// A local TCP peer that understands command framing. This exercises the real
// Redis client's heartbeat and reconnection, without a Redis server or .env URL.
const readCommand = (buffer) => {
  const headerEnd = buffer.indexOf("\r\n");
  if (headerEnd < 0) return;
  const count = Number(buffer.toString("utf8", 1, headerEnd));
  let offset = headerEnd + 2;
  const args = [];
  for (let index = 0; index < count; index++) {
    const lengthEnd = buffer.indexOf("\r\n", offset);
    if (lengthEnd < 0) return;
    const length = Number(buffer.toString("utf8", offset + 1, lengthEnd));
    const start = lengthEnd + 2;
    if (buffer.length < start + length + 2) return;
    args.push(buffer.toString("utf8", start, start + length));
    offset = start + length + 2;
  }
  return { args, bytes: offset };
};

let server;
let client;
const sockets = new Set();

afterEach(async () => {
  client?.destroy();
  for (const socket of sockets) socket.destroy();
  sockets.clear();
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("detects a silent outage without HTTP traffic and reconnects when replies resume", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  let paused = false;
  const pending = [];
  let connectionCount = 0;

  server = net.createServer((socket) => {
    connectionCount++;
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    let buffer = Buffer.alloc(0);
    socket.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);
      let command;
      while ((command = readCommand(buffer))) {
        buffer = buffer.subarray(command.bytes);
        const reply = command.args[0] === "PING" ? "+PONG\r\n"
          : command.args[0] === "HELLO" ? "%1\r\n+proto\r\n:3\r\n"
          : "+OK\r\n";
        if (paused) pending.push({ socket, reply });
        else socket.write(reply);
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  vi.stubEnv("REDIS_URL", `redis://127.0.0.1:${server.address().port}`);
  vi.resetModules();
  const redis = await import("../../config/redis.js");
  client = redis.default;
  await redis.connectRedis();
  expect(client.isReady).toBe(true);

  // Leave the TCP connection open but stop sending replies, as with a blackhole.
  paused = true;
  await vi.waitFor(() => {
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Using local memory"));
  }, { timeout: 8000, interval: 25 });
  expect(client.isReady).toBe(false);
  await vi.waitFor(() => expect(connectionCount).toBeGreaterThan(1));
  expect(console.warn).toHaveBeenCalledTimes(1);

  paused = false;
  for (const { socket, reply } of pending.splice(0)) {
    if (!socket.destroyed) socket.write(reply);
  }
  await vi.waitFor(() => expect(client.isReady).toBe(true));
  expect(console.info).toHaveBeenCalledTimes(2);
}, 15000);
