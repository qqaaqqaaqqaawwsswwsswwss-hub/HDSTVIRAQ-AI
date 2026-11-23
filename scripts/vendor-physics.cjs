'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const entry = require.resolve('cannon-es');
const packageRoot = path.resolve(path.dirname(entry), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
if (pkg.name !== 'cannon-es' || pkg.version !== '0.20.0' || pkg.license !== 'MIT') {
  throw new Error(`Unexpected Cannon-es package identity/license: ${pkg.name}@${pkg.version} (${pkg.license})`);
}
for (const [source, target] of [
  [path.join(packageRoot, 'dist/cannon-es.js'), path.join(root, 'app/src/main/assets/cannon-es.mjs')],
  [path.join(packageRoot, 'LICENSE'), path.join(root, 'third_party/CANNON-ES-LICENSE')],
]) {
  if (!fs.existsSync(source)) throw new Error(`Missing Cannon-es distribution file: ${source}`);
  fs.copyFileSync(source, target);
}
console.log(`Vendored cannon-es ${pkg.version} (${pkg.license}) and its license notice.`);
