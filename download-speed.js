#!/usr/bin/env node

const REQUEST_COUNT = 10;

function usage() {
  console.error('Usage: node download-speed.js <url>');
  process.exit(1);
}

function formatMs(ms) {
  return `${ms.toFixed(2)} ms`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function downloadOnce(url) {
  const started = performance.now();
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const elapsedMs = performance.now() - started;

  return {
    elapsedMs,
    bytes: buffer.byteLength,
  };
}

async function main() {
  const url = process.argv[2];
  if (!url) usage();

  try {
    // Validate early so a typo fails before the loop.
    new URL(url);
  } catch {
    console.error(`Invalid URL: ${url}`);
    process.exit(1);
  }

  const successes = [];
  let failures = 0;

  for (let i = 1; i <= REQUEST_COUNT; i++) {
    process.stdout.write(`[${i}/${REQUEST_COUNT}] ${url} ... `);
    try {
      const result = await downloadOnce(url);
      successes.push(result);
      console.log(`ok (${formatMs(result.elapsedMs)}, ${formatBytes(result.bytes)})`);
    } catch (err) {
      failures += 1;
      console.log('failed');
      console.error(`  ${err.message}`);
    }
  }

  if (successes.length === 0) {
    console.error('\nAll requests failed. No metrics to report.');
    process.exit(1);
  }

  const totalBytes = successes.reduce((sum, r) => sum + r.bytes, 0);
  const totalMs = successes.reduce((sum, r) => sum + r.elapsedMs, 0);
  const avgMs = totalMs / successes.length;
  const totalSeconds = totalMs / 1000;
  // kilobits per second: (bytes * 8 bits) / 1000 / seconds
  const speedKbps = (totalBytes * 8) / 1000 / totalSeconds;

  console.log('\n--- Results ---');
  console.log(`Successful requests: ${successes.length}/${REQUEST_COUNT}`);
  if (failures > 0) {
    console.log(`Failed requests:     ${failures}`);
  }
  console.log(`Average time:        ${formatMs(avgMs)}`);
  console.log(`Total downloaded:    ${formatBytes(totalBytes)} (${totalBytes} bytes)`);
  console.log(`Download speed:      ${speedKbps.toFixed(2)} kbit/s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
