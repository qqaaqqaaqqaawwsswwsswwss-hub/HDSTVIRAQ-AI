# MDR Platform 3.0.0 — Change Summary

MDR 3.0.0 adds a set of foundational systems intended to extend the 2.5.0 game-engine and Android app-factory source.

- Procedural World Planner: deterministic themed layouts, seeded placement, bounded output, JSON export.
- Renderer Probe: WebGPU/WebGL2 feature and GPU-limit inspection, with explicit Vulkan limitation.
- Animation Bridge: safe named AnimationMixer actions, cross-fade, stop, and update.
- Multiplayer Transport: WebSocket connection, join message, bounded JSON message parsing/sending, event subscriptions.
- Visual Scripting Runtime: allow-listed graph nodes, cycle detection, variable/log nodes, bounded graph sizes.
- World Streaming: distance-prioritized chunk selection, active chunk budget, async load/unload callbacks.
- Vehicle Dynamics: arcade throttle, steering, braking, drag, grip and force calculation.
- NextGen dashboard: mobile-friendly floating panel to exercise the new foundations.

The new APIs are experimental foundations, not complete AAA-grade implementations. See README for exact integration boundaries and required external services.
