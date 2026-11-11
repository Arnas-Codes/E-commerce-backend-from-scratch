const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID;
const commitSha = process.env.GITHUB_SHA;

try {
  if (!apiKey || !serviceId || !commitSha) {
    throw new Error("Missing deployment configuration");
  }

  const deployUrl = `https://api.render.com/v1/services/${serviceId}/deploys`;
  const response = await fetch(deployUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ commitId: commitSha }),
    signal: AbortSignal.timeout(30_000), // 30 seconds timeout
  });

  if (!response.ok) {
    throw new Error(`Deployment failed with status ${response.status}`);
  }

  const deployData = await response.json();

  if (!deployData.id) {
    throw new Error("Deployment response missing deploy ID");
  }

  const deployId = deployData.id;
  const statusUrl = `https://api.render.com/v1/services/${serviceId}/deploys/${deployId}`;

  const deadline = Date.now() + 10 * 60 * 1000; // 10 minutes from now
  let isLive = false;
  const failedStatuses = [
    "build_failed",
    "update_failed",
    "pre_deploy_failed",
    "canceled",
    "deactivated",
  ];

  while (Date.now() < deadline) {
    const statusResponse = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(30_000), // 30 seconds timeout
    });

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to fetch deployment status with status ${statusResponse.status}`,
      );
    }

    const statusData = await statusResponse.json();
    console.log(`Deployment status: ${statusData.status}`);

    if (statusData.status === "live") {
      if (statusData.commit?.id !== commitSha) {
        throw new Error("Live deployment does not match the expected commit");
      }
      isLive = true;
      break;
    }
    if (failedStatuses.includes(statusData.status)) {
      throw new Error(`Deployment ended with status ${statusData.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  if (!isLive) {
    throw new Error(
      "Deployment did not become live within the expected time frame",
    );
  }
  console.log("The expected commit is live.");
} catch (error) {
  console.error("Error: ", error.message);
  process.exit(1);
}
