import { createHash } from 'node:crypto';
import { release, arch, platform } from 'node:os';

/** Test-harness evidence only; hashes the actually served script bytes. */
export async function frozenBuildReceipt(page, browser) {
  const urls = await page.evaluate(() => Array.from(document.scripts).map(script => script.src).filter(Boolean));
  const scripts = await Promise.all(urls.map(async url => ({ url,
    sha256: createHash('sha256').update(new Uint8Array(await (await fetch(url)).arrayBuffer())).digest('hex'),
  })));
  const expected = process.env.INKSTORM_EXPECTED_BUILD;
  if (expected && (scripts.length !== 1 || scripts[0].sha256 !== expected)) {
    throw new Error(`Frozen build mismatch: ${JSON.stringify(scripts)}; expected ${expected}`);
  }
  return { scripts, browser: browser.version(), node: process.version,
    os: { platform: platform(), release: release(), architecture: arch() },
    page: await page.evaluate(() => ({ userAgent: navigator.userAgent, width: innerWidth, height: innerHeight,
      devicePixelRatio, hardwareConcurrency: navigator.hardwareConcurrency })),
  };
}
