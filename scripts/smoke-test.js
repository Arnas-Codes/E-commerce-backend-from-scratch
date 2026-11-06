const baseUrl = process.env.API_BASE_URL;

try {
  if (!baseUrl) {
    throw new Error("API_BASE_URL is missing.");
  }
  const url = new URL("/products", baseUrl);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(90_000), // 90 seconds timeout
  });

  if (response.status !== 200) {
    throw new Error(`Expected status 200, received ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.products)) {
    throw new Error("Expected products to be an array");
  }
  console.log("Smoke test passed: products API returned valid data.");
} catch (error) {
  console.error("Error during smoke test:", error.message);
  process.exitCode = 1;
}
