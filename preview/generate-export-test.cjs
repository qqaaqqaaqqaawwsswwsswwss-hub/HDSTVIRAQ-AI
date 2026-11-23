const fs = require('node:fs/promises');
const path = require('node:path');
const src = '/mnt/data/mdr_work/app/src/main/assets';
const Exporter = require('../app/src/main/assets/mdr-export.js');
globalThis.location = { href: 'https://appassets.androidplatform.net/assets/index.html' };
globalThis.MDRStudio = { packageSnapshot: async () => ({ project: { schema:'mdr-scene', version:3, name:'Export Test', objects:[] }, assets: [] }) };
globalThis.fetch = async input => {
  const url = new URL(String(input));
  const filename = path.basename(url.pathname);
  const body = await fs.readFile(path.join(src, filename));
  return new Response(body, { status: 200 });
};
let captured;
const oldCreate = URL.createObjectURL;
URL.createObjectURL = blob => { captured = blob; return 'blob:test'; };
URL.revokeObjectURL = () => {};
globalThis.document = {
  createElement() { return { style:{}, click(){}, remove(){}, href:'', download:'' }; },
  body: { appendChild(){} }
};
globalThis.setTimeout = fn => 0;
(async () => {
  const result = await Exporter.exportGameBuild();
  await fs.writeFile('/mnt/data/mdr_work/preview/MDR-Game-Web-Android-Export-test.zip', Buffer.from(await captured.arrayBuffer()));
  process.stdout.write(JSON.stringify(result));
  URL.createObjectURL = oldCreate;
})().catch(error => { console.error(error); process.exit(1); });
