/**
 * Regression tests for the `hivemind-dev` hot-reload service added to
 * `docker-compose.yml` (PR #2783).
 *
 * The dev profile only works correctly if a handful of invariants hold, and
 * every one of them is easy to break silently with an unrelated edit:
 *
 *   1. `hivemind-dev` must be gated behind the `dev` profile — otherwise a
 *      plain `docker compose up` would boot the hot-reload container too and
 *      fight the baked production container.
 *   2. It must NOT collide with the production `hivemind` container's published
 *      port (3028). If someone re-maps either service the two containers can no
 *      longer coexist, defeating the whole point of the variant.
 *   3. It must bind-mount the source tree (`./src`, `./packages`) so tsx/Vite
 *      hot-reload sees host edits, and it must keep the container's own
 *      `node_modules` (anonymous volume) so the host's absent/foreign modules
 *      don't shadow the installed ones.
 *   4. It must build from `Dockerfile.dev`, not the production `Dockerfile`.
 *
 * These are pure-config invariants, so we parse the actual committed compose
 * file and assert against it. The tiny parser below covers exactly the
 * docker-compose subset we use (no external YAML dependency required, which
 * keeps the test resilient under the pnpm strict node_modules layout).
 */
import * as fs from 'fs';
import * as path from 'path';

const COMPOSE_PATH = path.resolve(__dirname, '../../../docker-compose.yml');

/** A parsed service: scalar fields, plus the raw indented lines of its block. */
interface ParsedService {
  /** Raw text lines belonging to this service (indented under its key). */
  lines: string[];
}

/**
 * Minimal docker-compose parser. Extracts the top-level `services:` map and,
 * for each service, the raw block of lines beneath it. We deliberately keep
 * value extraction line-based (rather than building a full YAML tree) so the
 * assertions read against the literal file content.
 */
function parseServices(yaml: string): Record<string, ParsedService> {
  const lines = yaml.split(/\r?\n/);

  // Find the `services:` top-level key (column 0).
  const servicesIdx = lines.findIndex((l) => /^services:\s*$/.test(l));
  expect(servicesIdx).toBeGreaterThanOrEqual(0);

  const services: Record<string, ParsedService> = {};
  let current: string | null = null;

  for (let i = servicesIdx + 1; i < lines.length; i++) {
    const line = lines[i];

    // Blank or comment-only lines are kept inside the current block but never
    // start/stop a service.
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      if (current) services[current].lines.push(line);
      continue;
    }

    // A new top-level key (column 0, non-space) ends the services section.
    if (/^\S/.test(line)) break;

    // A service header is exactly two-space indented: `  name:`.
    const header = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (header) {
      current = header[1];
      services[current] = { lines: [] };
      continue;
    }

    if (current) services[current].lines.push(line);
  }

  return services;
}

/** True if any line in the block (trimmed) equals or starts with `needle`. */
function blockHas(svc: ParsedService, needle: string): boolean {
  return svc.lines.some((l) => l.trim() === needle || l.trim().startsWith(needle));
}

/** Collect the published `host:container` port mappings from a service block. */
function publishedPorts(svc: ParsedService): Array<{ host: string; container: string }> {
  const result: Array<{ host: string; container: string }> = [];
  for (const raw of svc.lines) {
    // e.g. `      - '3029:3028'` or `      - 3028:3028`
    const m = raw.trim().match(/^-\s*['"]?(\d+):(\d+)['"]?\s*$/);
    if (m) result.push({ host: m[1], container: m[2] });
  }
  return result;
}

describe('docker-compose.yml dev profile (hivemind-dev)', () => {
  const yaml = fs.readFileSync(COMPOSE_PATH, 'utf8');
  const services = parseServices(yaml);

  it('defines both the production and dev hot-reload services', () => {
    expect(Object.keys(services)).toEqual(expect.arrayContaining(['hivemind', 'hivemind-dev']));
  });

  it('gates hivemind-dev behind the "dev" profile so plain `up` skips it', () => {
    const dev = services['hivemind-dev'];
    // The profile gate is what keeps `docker compose up` from booting the
    // hot-reload variant alongside production. Without it the PR is unsafe.
    expect(blockHas(dev, 'profiles:')).toBe(true);
    expect(dev.lines.some((l) => /profiles:\s*\[\s*["']dev["']\s*\]/.test(l))).toBe(true);
  });

  it('does NOT put the production hivemind service behind any profile', () => {
    // Production must always start on a bare `docker compose up`.
    expect(blockHas(services['hivemind'], 'profiles:')).toBe(false);
  });

  it('publishes the dev variant on a host port that does not collide with prod', () => {
    const devPorts = publishedPorts(services['hivemind-dev']);
    const prodPorts = publishedPorts(services['hivemind']);

    expect(devPorts.length).toBeGreaterThan(0);
    expect(prodPorts.length).toBeGreaterThan(0);

    const devHostPorts = devPorts.map((p) => p.host);
    const prodHostPorts = prodPorts.map((p) => p.host);

    // The two containers are meant to coexist; published host ports must differ.
    for (const hp of devHostPorts) {
      expect(prodHostPorts).not.toContain(hp);
    }

    // The dev variant still targets the app's internal port (3028) so PORT/env
    // and the healthcheck line up.
    expect(devPorts.some((p) => p.container === '3028')).toBe(true);
  });

  it('builds the dev variant from Dockerfile.dev, not the production Dockerfile', () => {
    const dev = services['hivemind-dev'];
    expect(dev.lines.some((l) => /dockerfile:\s*Dockerfile\.dev\s*$/.test(l))).toBe(true);
  });

  it('bind-mounts the source tree so tsx/Vite hot-reload sees host edits', () => {
    const dev = services['hivemind-dev'];
    const mounts = dev.lines.map((l) => l.trim());
    // src + packages are the hot-reload essentials.
    expect(mounts).toEqual(expect.arrayContaining(['- ./src:/app/src', '- ./packages:/app/packages']));
  });

  it('keeps the container node_modules via an anonymous volume', () => {
    const dev = services['hivemind-dev'];
    // The host has no (or a foreign-platform) node_modules; the anonymous
    // volume shields the container's installed copy from being shadowed.
    expect(dev.lines.some((l) => l.trim() === '- /app/node_modules')).toBe(true);
  });

  it('waits for redis to be healthy before starting the dev variant', () => {
    const dev = services['hivemind-dev'];
    expect(blockHas(dev, 'depends_on:')).toBe(true);
    expect(dev.lines.some((l) => l.trim() === 'redis:')).toBe(true);
    expect(dev.lines.some((l) => /condition:\s*service_healthy/.test(l))).toBe(true);
  });
});
