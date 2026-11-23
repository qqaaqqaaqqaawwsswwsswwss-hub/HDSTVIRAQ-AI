# MDR Platform 2.4.0 — Change Summary

## New engine technologies
- MDR Physics 0.1: fixed-step rigid-body simulation for static, dynamic and kinematic box/sphere bodies; gravity, force/impulse integration, damping, restitution, friction, collision masks, trigger sensors and collision/trigger lifecycle events. Broadphase uses sweep-and-prune with pair/body budgets.
- MDR SmartScale 1.0: adaptive WebGL pixel-ratio scaling using a moving frame-time window, hysteresis, gradual quality recovery, and low-quality shadow reduction. The runtime adds a compact Auto/Full quality chip.
- MDR Scene Budget: opt-in distance visibility and shadow budget for developer-registered objects. Boundary hysteresis avoids visible flicker.
- SmartScale attaches to the current MDR world-ready lifecycle and removes its render-system hook, UI control, and visibility listener when the world is destroyed. Original renderer pixel ratio and shadow state are restored.

## Retained capabilities
- Three.js-based mobile game scene and fixed-step ECS loop.
- MDR Studio primitives and static GLB 2.0 asset import/storage/export.
- AI Image-to-3D task flow and Android WebView application factory.

## Explicit limitations
- Physics supports only axis-aligned box and sphere colliders; no angular dynamics, constraints/joints, CCD, mesh collider or skeletal ragdoll.
- SmartScale reacts to frame-time pressure, not direct device thermal telemetry. Scene Budget affects only objects explicitly registered by application code; it is not global occlusion culling.
- This is a development release and not yet a feature-equivalent replacement for Unity, Unreal Engine or Godot.
- APK build, real-device GPU/WebGL smoke test, and thermal/performance profiling were not performed in this environment.
