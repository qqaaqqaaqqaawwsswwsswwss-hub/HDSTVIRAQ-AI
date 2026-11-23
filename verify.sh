#!/bin/sh
set -eu
python3 tools/verify_source.py
node --test tools/tests/*.test.cjs
node --check app/src/main/assets/mdr-studio-core.js
node --check app/src/main/assets/mdr-physics.js
node --check app/src/main/assets/mdr-performance.js
node --check app/src/main/assets/mdr-ai3d.js
node --check app/src/main/assets/mdr-glb-loader.js
node --check app/src/main/assets/mdr-asset-store.js
node --check app/src/main/assets/mdr-studio-runtime.js
node --check app/src/main/assets/mdr-quality-studio.js
node --check app/src/main/assets/mdr-export.js
node --check app/src/main/assets/mdr-quality-panel.js
node --check app/src/main/assets/mdr-mobile-ui.js
node --check app/src/main/assets/mdr-nextgen.js
node --check app/src/main/assets/mdr-game-bootstrap.js
sh -n gradlew
echo 'MDR VERIFY ALL: PASS'
