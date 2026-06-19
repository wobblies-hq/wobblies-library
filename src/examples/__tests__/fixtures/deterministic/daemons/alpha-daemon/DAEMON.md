---
id: alpha-wobbly
purpose: Keep the alpha-wobbly fixture valid for catalog generation tests.
watch:
  - Wake on pull request changes for this fixture.
routines:
  - Inspect the trigger and produce a bounded handoff.
deny:
  - Do not mutate production resources.
---

# alpha-wobbly

## Policy

Use only public-safe fixture content and no-op when context is missing.
