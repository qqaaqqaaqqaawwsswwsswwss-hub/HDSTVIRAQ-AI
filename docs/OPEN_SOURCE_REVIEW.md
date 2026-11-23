# Open-source adoption review

## Changes in 3.1.0

The Baghdad procedural layout, guarded conversion into the MDR scene schema, install prompt, and offline cache are original additions to this repository. They use browser APIs and the project's existing scene bridge; no third-party source files were copied into the application.

## Regional candidate reviewed

- [LERAYES16/Risha-Engine](https://github.com/LERAYES16/Risha-Engine) describes itself as an Arabic game engine. GitHub's repository metadata reports the license as `NOASSERTION` (Other), so the source cannot safely be incorporated or redistributed as open-source code without clarification from its author. No code from this repository is used here.

## Integration rule

New dependencies are only added after checking the upstream source, exact version, license text/SPDX identifier, asset terms and browser/mobile compatibility. When no license-clear regional code is suitable for a feature, implement the feature against MDR's documented local APIs rather than copying unlicensed code.
