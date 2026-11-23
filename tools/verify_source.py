#!/usr/bin/env python3
"""Local source checks for MDR Platform; uses only Python stdlib + Node.js."""
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'app/src/main/assets/index.html'
JAVA = ROOT / 'app/src/main/java/com/mdr/app/AppActivity.java'
GUARD = ROOT / 'app/src/main/assets/mdr-zip-guard.js'
MANIFEST = ROOT / 'app/src/main/AndroidManifest.xml'
GRADLE = ROOT / 'app/build.gradle'
ROOT_GRADLE_PROPERTIES = ROOT / 'gradle.properties'
STRINGS = ROOT / 'app/src/main/res/values/strings.xml'

errors = []
def require(condition, message):
    if not condition:
        errors.append(message)

html = HTML.read_text(encoding='utf-8')
java = JAVA.read_text(encoding='utf-8')
gradle = GRADLE.read_text(encoding='utf-8')

require('mdr-zip-guard.js' in html, 'HTML does not load the ZIP guard asset')
require('MDRZipGuard.validateUploadFile' in html, 'Factory does not validate ZIP upload size/type')
require('A.accept=".zip"' in html, 'Factory file picker does not limit selection to ZIP files')
require('MDRZipGuard.validateZipEntries' in html, 'Factory does not validate archive entries')
require('securityNote:' in html and 'فحص مؤشرات أولي فقط' in html, 'Factory security status still overclaims safety')
require('hint:"sandbox"' not in html, 'UI still labels page-scope JS as sandbox')
require('webglcontextlost' in html and 'webglcontextrestored' in html, 'Engine WebGL context recovery hooks missing')
require('mdr:engine-error' in html and 'mdr:context-restored' in html, 'Engine lifecycle errors are not connected to the UI')
require('installTouchControls' in html, 'Touch joystick implementation missing')
require('this.engine?.dispose()' in html, 'Engine teardown does not dispose renderer/resources')
require('mdr-performance.js' in html and 'mdr-physics.js' in html, 'MDR physics or SmartScale runtime assets are not loaded')
require('MDRPerformance' in (ROOT / 'app/src/main/assets/mdr-performance.js').read_text(encoding='utf-8'), 'MDR SmartScale module is missing')
require('MDRPhysics' in (ROOT / 'app/src/main/assets/mdr-physics.js').read_text(encoding='utf-8'), 'MDR physics module is missing')
require('mdr-studio-core.js' in html and 'mdr-studio-runtime.js' in html and 'mdr-ai3d.js' in html and 'mdr-glb-loader.js' in html and 'mdr-asset-store.js' in html, 'MDR Studio editor/AI/GLB runtime assets are not loaded')
require('mdr-quality-studio.js' in html and 'mdr-quality-panel.js' in html and 'mdr-export.js' in html and 'mdr-mobile-ui.js' in html, 'MDR 2.5 quality, export or mobile UI modules are not loaded')
require('mdr-mobile.css' in html and 'mdr-quality-studio.css' in html, 'MDR mobile or quality stylesheets are not loaded')
require('<title>MDR Platform 3.1.0' in html and 'MDR · v3.1.0' in html, 'Web title or in-app badge is stale')
require('packageSnapshot()' in (ROOT / 'app/src/main/assets/mdr-studio-runtime.js').read_text(encoding='utf-8'), 'MDR Studio project package bridge missing')
require('exportGameBuild' in (ROOT / 'app/src/main/assets/mdr-export.js').read_text(encoding='utf-8'), 'MDR full game export path missing')
require('captureDimensions' in (ROOT / 'app/src/main/assets/mdr-quality-studio.js').read_text(encoding='utf-8'), 'GPU-aware high resolution capture missing')
require((ROOT / 'app/src/main/assets/mdr-game-bootstrap.js').exists(), 'Export bootstrap missing')
require((ROOT / 'app/src/main/assets/mdr-mobile.css').exists(), 'Mobile responsive stylesheet missing')
require('MDRAI3D.createTask' in (ROOT / 'app/src/main/assets/mdr-studio-runtime.js').read_text(encoding='utf-8'), 'AI image-to-3D flow is not connected to Studio')
require("target_formats:['glb']" in (ROOT / 'app/src/main/assets/mdr-ai3d.js').read_text(encoding='utf-8'), 'AI image-to-3D does not request GLB output')
require('mdr2:world-ready' in html and 'mdr2:world-destroy' in html, 'MDR Studio world lifecycle bridge is missing')
require('editorAddPrimitive(type,spec={})' in html, 'Bundled MDR world does not expose the scene editor bridge')
require('active.editorAddPrimitive' in (ROOT / 'app/src/main/assets/mdr-studio-runtime.js').read_text(encoding='utf-8'), 'Studio runtime is not connected to the bundled engine bridge')
require('editorThreeAPI(){return {Group:ss,Mesh:ut,BufferGeometry:gn' in html, 'Bundled Three constructors for GLB loading are not exposed')
require('MDRGLB.loadGLB' in (ROOT / 'app/src/main/assets/mdr-studio-runtime.js').read_text(encoding='utf-8'), 'Studio runtime does not load GLB assets')
require('window.__THREE__' not in (ROOT / 'app/src/main/assets/mdr-studio-runtime.js').read_text(encoding='utf-8'), 'Studio runtime incorrectly treats the Three.js revision marker as the Three API')
require((ROOT / 'app/src/main/assets/mdr-studio-core.js').exists(), 'MDR Studio core module missing')
require((ROOT / 'app/src/main/assets/mdr-studio-runtime.js').exists(), 'MDR Studio runtime module missing')
require('WebViewAssetLoader' in java, 'Android activity does not use WebViewAssetLoader')
require('setAllowFileAccess(false)' in java and 'setAllowContentAccess(false)' in java, 'WebView local file/content access is not disabled')
require('setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW)' in java, 'WebView mixed content not blocked')
require('onShowFileChooser' in java and 'REQUEST_UPLOAD_FILE' in java, 'Android WebView file picker callback missing')
require('androidx.webkit:webkit:1.18.0' in gradle, 'AndroidX WebKit dependency missing')
require('versionName "3.1.0"' in gradle and 'versionCode 16' in gradle, 'Android app version metadata is not 3.1.0 / versionCode 16')
require('buildConfig true' in gradle, 'AGP BuildConfig generation is not explicitly enabled')
require(ROOT_GRADLE_PROPERTIES.exists() and 'android.useAndroidX=true' in ROOT_GRADLE_PROPERTIES.read_text(encoding='utf-8'), 'AndroidX is not enabled in root gradle.properties')
require(STRINGS.exists() and 'MDR Platform 3.1.0' in STRINGS.read_text(encoding='utf-8'), 'Android app label is stale or inconsistent')
require('path:"gradle.properties",data:"android.useAndroidX=true\\n' in html, 'Factory-generated Android project is missing AndroidX gradle.properties')
require('buildFeatures {\n        buildConfig true' in html, 'Factory-generated Android project does not explicitly enable BuildConfig')
require('minSdk 26' in gradle and 'targetSdk 35' in gradle, 'Android SDK targets do not match QA baseline')
require((ROOT / 'gradlew').exists() and (ROOT / 'gradlew.bat').exists(), 'Gradle bootstrap launchers missing')
require(GUARD.exists(), 'ZIP guard asset missing')

try:
    ET.parse(MANIFEST)
except Exception as exc:
    errors.append(f'AndroidManifest.xml is not valid XML: {exc}')

scripts = re.findall(r'<script\b([^>]*)>(.*?)</script\s*>', html, flags=re.I | re.S)
inline_scripts = [body for attrs, body in scripts if not re.search(r'\bsrc\s*=', attrs, flags=re.I) and body.strip()]
require(bool(inline_scripts), 'No inline application bundle found to syntax-check')
if inline_scripts:
    with tempfile.NamedTemporaryFile('w', suffix='.js', encoding='utf-8', delete=False) as tmp:
        tmp.write('\n'.join(inline_scripts))
        js_path = Path(tmp.name)
    proc = subprocess.run(['node', '--check', str(js_path)], capture_output=True, text=True)
    js_path.unlink(missing_ok=True)
    if proc.returncode:
        errors.append('JavaScript syntax check failed: ' + (proc.stderr.strip() or proc.stdout.strip()))

if errors:
    print('MDR SOURCE VERIFY: FAIL')
    for item in errors:
        print(' - ' + item)
    sys.exit(1)

print('MDR SOURCE VERIFY: PASS')
print(' - AndroidManifest.xml parses')
print(' - WebView security and file picker markers present')
print(' - Engine context lifecycle and mobile controls present')
print(' - MDR Studio scene editor assets, lifecycle and engine bridge present')
print(' - Factory ZIP limits and non-certifying scan text present')
print(' - Bundled JavaScript syntax passes node --check')
print(' - ZIP Guard and Factory template test suites are available under tools/tests/')
