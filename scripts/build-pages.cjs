'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'dist');
const destination = path.join(root, 'docs');

if (!fs.existsSync(path.join(source, 'index.html'))) {
  throw new Error('Run `npm run build:web` before creating the GitHub Pages snapshot.');
}
fs.cpSync(source, destination, { recursive: true, force: true });
console.log(`GitHub Pages snapshot updated in ${path.relative(root, destination)}/`);
