import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const upstreamDir = path.join(root, 'florilegium');
const require = createRequire(import.meta.url);

async function copy(source, relativeDestination) {
  const destination = path.join(publicDir, relativeDestination);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

// Copy the pinned sources verbatim; do not fetch a moving upstream branch at build time.
let upstreamFiles;
try {
  upstreamFiles = await readdir(upstreamDir);
  await readFile(path.join(upstreamDir, 'florilegium.lua'));
} catch {
  throw new Error('Florilegium is missing. Run: git submodule update --init --recursive');
}
const luaFiles = upstreamFiles.filter((name) => /^florilegium(?:-[\w-]+)?\.lua$/.test(name)).sort();
for (const name of luaFiles) {
  await copy(path.join(upstreamDir, name), `vendor/florilegium/${name}`);
}
await copy(path.join(upstreamDir, 'LICENSE'), 'vendor/florilegium/LICENSE');
await copy(path.join(root, 'licenses', 'LPPL-1.3c.txt'), 'vendor/florilegium/LPPL-1.3c.txt');

const pgfmath = await readFile(path.join(upstreamDir, 'florilegium-pgfmath.lua'), 'utf8');
const pgfmathNotice = pgfmath.slice(0, pgfmath.indexOf('\nlocal M = {}'));
await writeFile(
  path.join(publicDir, 'vendor/florilegium/PGFMATH-NOTICE.txt'),
  pgfmathNotice,
  'utf8',
);

for (const font of ['fell.woff2', 'fell-italic.woff2', 'OFL.txt', 'README.md']) {
  await copy(path.join(upstreamDir, 'web', 'fonts', font), `fonts/${font}`);
}
for (const directory of ['greatvibes', 'marckscript', 'badscript']) {
  for (const file of await readdir(path.join(root, 'assets', 'fonts', directory))) {
    await copy(path.join(root, 'assets', 'fonts', directory, file), `fonts/${directory}/${file}`);
  }
}

let wasmoonRoot;
try {
  wasmoonRoot = path.dirname(require.resolve('wasmoon/package.json'));
} catch {
  throw new Error('Wasmoon is missing. Install the locked dependencies with npm ci.');
}
await copy(path.join(wasmoonRoot, 'dist', 'glue.wasm'), 'vendor/wasmoon/glue.wasm');
await copy(path.join(wasmoonRoot, 'LICENSE'), 'vendor/wasmoon/LICENSE');
await copy(path.join(root, 'licenses', 'Lua-MIT.txt'), 'vendor/wasmoon/Lua-MIT.txt');

// Ship notices for the installed runtime dependency graph, including transitive
// dependencies. Tooling-only packages are not included in the published bundle.
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const queue = Object.keys(packageJson.dependencies ?? {}).map((name) => ({ name, from: root }));
const visited = new Set();
const dependencyNotices = [];
while (queue.length) {
  const { name, from } = queue.shift();
  let packageRoot;
  try {
    packageRoot = path.dirname(require.resolve(`${name}/package.json`, { paths: [from] }));
  } catch {
    // Some packages restrict package.json exports. Locate the installed package
    // through Node's search paths without importing or executing package code.
    for (const searchPath of createRequire(path.join(from, 'package.json')).resolve.paths(name) ??
      []) {
      const candidate = path.join(searchPath, name);
      try {
        await readFile(path.join(candidate, 'package.json'));
        packageRoot = candidate;
        break;
      } catch {
        /* try the next Node module search path */
      }
    }
  }
  if (!packageRoot) throw new Error(`Cannot locate installed runtime dependency: ${name}`);
  if (visited.has(packageRoot)) continue;
  visited.add(packageRoot);
  const metadata = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const files = (await readdir(packageRoot)).filter((file) =>
    /^(licen[cs]e|copying|notice)(?:\.[\w-]+)?$/i.test(file),
  );
  if (!files.length)
    throw new Error(`No license notice found for runtime dependency: ${metadata.name}`);
  const noticeDirectory = `licenses/${metadata.name.replaceAll('/', '__')}`;
  const links = [];
  for (const file of files.sort()) {
    await copy(path.join(packageRoot, file), `${noticeDirectory}/${file}`);
    links.push(`[${file}](${noticeDirectory}/${file})`);
  }
  dependencyNotices.push(
    `- ${metadata.name} ${metadata.version} (${metadata.license ?? 'see notice'}): ${links.join(', ')}`,
  );
  for (const dependency of Object.keys(metadata.dependencies ?? {}))
    queue.push({ name: dependency, from: packageRoot });
}

const notices = await readFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
await writeFile(
  path.join(publicDir, 'THIRD_PARTY_NOTICES.md'),
  `${notices}\n## Installed runtime dependencies\n\n${dependencyNotices.sort().join('\n')}\n`,
  'utf8',
);
console.log(
  `Prepared ${luaFiles.length} pinned Lua modules, local WASM, fonts and ${visited.size} runtime notices.`,
);
