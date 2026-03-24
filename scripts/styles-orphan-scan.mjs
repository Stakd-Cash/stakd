import fs from 'fs';
import path from 'path';

const css = fs.readFileSync('styles.css', 'utf8');
const classes = new Set();
const re = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
let m;
while ((m = re.exec(css))) {
  classes.add(m[1]);
}

const srcFiles = [];
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory() && f.name !== 'node_modules') walk(p);
    else if (/\.(jsx|js|css)$/.test(f.name)) srcFiles.push(p);
  }
}
walk('src');

let bundle = '';
for (const f of srcFiles) {
  bundle += fs.readFileSync(f, 'utf8') + '\n';
}
for (const root of ['app.jsx', 'index.html']) {
  try {
    bundle += fs.readFileSync(root, 'utf8') + '\n';
  } catch {
    /* optional */
  }
}
bundle += fs.readFileSync('src/styles/admin.css', 'utf8');
bundle += fs.readFileSync('src/styles/components.css', 'utf8');

const orphans = [];
for (const c of classes) {
  const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const needle = new RegExp('\\b' + esc + '\\b');
  if (!needle.test(bundle)) orphans.push(c);
}
orphans.sort();
console.log(JSON.stringify({ total: classes.size, orphanCount: orphans.length, orphans }, null, 0));
