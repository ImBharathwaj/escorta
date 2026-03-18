/* eslint-disable no-console */
const autocannon = require("autocannon");

function run(title, url, opts) {
  return new Promise((resolve, reject) => {
    console.log(`\n== ${title} ==\n${url}`);
    const inst = autocannon(
      {
        url,
        connections: opts.connections ?? 25,
        duration: opts.duration ?? 15,
        pipelining: 1,
      },
      (err, res) => {
        if (err) return reject(err);
        resolve(res);
      }
    );
    autocannon.track(inst, { renderProgressBar: true });
  });
}

async function main() {
  const base = process.env.BASE_URL || "http://localhost:3000";

  // Public read endpoints (no auth)
  await run("Adult services", `${base}/api/adult-services`, { connections: 50, duration: 15 });
  await run("Escort listing", `${base}/api/escorts?city=chennai`, { connections: 50, duration: 15 });
  await run("Live sessions list", `${base}/api/live/sessions`, { connections: 50, duration: 15 });

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

