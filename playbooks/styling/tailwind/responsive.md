# Tailwind Responsive UI

> **Web-track (advisory):** pos-app's current baseline is Expo React Native with StyleSheet + design tokens (see `CONTEXT.md` → Product Decisions). This playbook activates with the planned web migration; until then it is reference only and must not override the token system in `src/theme/`.

## Responsive and Accessible UI

Start with the narrow layout and add the project's standard breakpoint variants as space becomes
available. Avoid inventing a custom breakpoint for each component. Keep responsive utilities with
the component that owns the layout.

Preserve semantic HTML, keyboard navigation, visible focus, readable text, sufficient contrast,
disabled states, and reduced-motion preferences. Hover must not be the only interaction signal.
Prefer named transition and animation tokens over repeated arbitrary timing values.
