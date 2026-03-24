import fs from 'fs';

const css = fs.readFileSync('src/styles/components.css', 'utf8');
const doc = fs.readFileSync('DESIGN-SYSTEM.md', 'utf8');

const cssClasses = new Set();
const re = /\.(sk-[a-zA-Z0-9_-]+)/g;
let m;
while ((m = re.exec(css))) {
  cssClasses.add(m[1]);
}

const docClasses = new Set();
const re2 = /`\.(sk-[a-zA-Z0-9_.{}]+)`/g;
while ((m = re2.exec(doc))) {
  const raw = m[1];
  if (raw.includes('{')) continue;
  if (raw.includes('.')) {
    raw.split(/[+/.]/).forEach((p) => {
      if (p.startsWith('sk-')) docClasses.add(p);
    });
  } else {
    docClasses.add(raw);
  }
}

const inDocNotCss = [...docClasses].filter((c) => !cssClasses.has(c)).sort();
const inCssNotDoc = [...cssClasses].filter((c) => !docClasses.has(c)).sort();

console.log('IN_DOC_NOT_CSS', JSON.stringify(inDocNotCss, null, 2));
console.log('IN_CSS_NOT_DOC', JSON.stringify(inCssNotDoc, null, 2));
console.log('counts', docClasses.size, cssClasses.size);
