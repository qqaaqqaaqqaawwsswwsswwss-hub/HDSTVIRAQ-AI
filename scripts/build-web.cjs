'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'app/src/main/assets');
const output = path.join(root, 'dist');

if (!fs.existsSync(path.join(source, 'index.html'))) {
  throw new Error(`Web application entry point is missing: ${source}`);
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(source, output, { recursive: true, dereference: true });
console.log(`MDR web build ready: ${path.relative(root, output)} (${fs.readdirSync(output).length} top-level assets)`);
