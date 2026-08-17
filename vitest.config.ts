import { defineConfig } from 'vitest/config';

// Unit tests live in tests/unit/<system>/ and exercise the pure TS modules
// under src-web/systems/. App.tsx (the React monolith) is intentionally not
// imported by unit tests — see production/gdd-integration/plan.md.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
