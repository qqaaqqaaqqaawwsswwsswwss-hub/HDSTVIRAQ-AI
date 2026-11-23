# Open-source adoption review

## Changes in 3.1.0

The Baghdad procedural layout, guarded conversion into the MDR scene schema, install prompt, and offline cache are original additions to this repository. They use browser APIs and the project's existing scene bridge; no third-party source files were copied into the application.

## Regional candidate reviewed

- [LERAYES16/Risha-Engine](https://github.com/LERAYES16/Risha-Engine) describes itself as an Arabic game engine. GitHub's repository metadata reports the license as `NOASSERTION` (Other), so the source cannot safely be incorporated or redistributed as open-source code without clarification from its author. No code from this repository is used here.

## Integration rule

New dependencies are only added after checking the upstream source, exact version, license text/SPDX identifier, asset terms and browser/mobile compatibility. When no license-clear regional code is suitable for a feature, implement the feature against MDR's documented local APIs rather than copying unlicensed code.

## Licensed engine component integrated in 3.2.0

- [pmndrs/cannon-es](https://github.com/pmndrs/cannon-es), version 0.20.0, distributed from npm as `cannon-es` under the MIT license. The exact license text is included at `third_party/CANNON-ES-LICENSE`. The adapter is isolated in `mdr-cannon-physics.mjs` and lazy-loaded when physics is invoked in the single unified edition.
- This is a technically suitable open-source project, but it is not represented as Middle-East-origin. The regional candidate above was not integrated because GitHub reports no asserted license.
