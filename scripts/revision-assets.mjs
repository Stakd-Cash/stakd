/* global console, process */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function revisionAssets() {
  const [appJs, appCss, criticalCss, stylesCss] = await Promise.all([
    readFile('dist/app.js', 'utf8'),
    readFile('dist/app.css', 'utf8'),
    readFile('critical.css', 'utf8'),
    readFile('styles.css', 'utf8'),
  ]);

  const version = createHash('sha256')
    .update(appJs)
    .update(appCss)
    .update(criticalCss)
    .update(stylesCss)
    .digest('hex')
    .slice(0, 10);

  const indexSource = await readFile('index.html', 'utf8');
  const nextIndex = indexSource
    .replace(/\/critical\.css\?v=[^"']+/g, `/critical.css?v=${version}`)
    .replace(/\/styles\.css\?v=[^"']+/g, `/styles.css?v=${version}`)
    .replace(/\/dist\/app\.css\?v=[^"']+/g, `/dist/app.css?v=${version}`)
    .replace(/\/dist\/app\.js\?v=[^"']+/g, `/dist/app.js?v=${version}`);

  const swSource = await readFile('sw.js', 'utf8');
  const nextSw = swSource
    .replace(/const CACHE_VERSION = '[^']+';/, `const CACHE_VERSION = '${version}';`)
    .replace(/\/critical\.css\?v=[^']+/g, `/critical.css?v=${version}`)
    .replace(/\/dist\/app\.css\?v=[^']+/g, `/dist/app.css?v=${version}`)
    .replace(/\/dist\/app\.js\?v=[^']+/g, `/dist/app.js?v=${version}`)
    .replace(/\/styles\.css\?v=[^']+/g, `/styles.css?v=${version}`);

  await Promise.all([
    writeFile('index.html', nextIndex),
    writeFile('sw.js', nextSw),
  ]);

  return version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  revisionAssets().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
