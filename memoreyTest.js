const memory = process.memoryUsage();

console.log({
  rssMB: Math.round(memory.rss / 1024 / 1024),
  heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
  heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
})