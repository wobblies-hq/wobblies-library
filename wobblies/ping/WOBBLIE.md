---
id: ping
purpose: Heartbeat check that confirms the wobblie runtime is alive and scheduling correctly.
routines:
  - Log a timestamped ping message to confirm the activation loop is running.
deny:
  - Do not create pull requests, issues, comments, or labels.
  - Do not modify any repository content.
  - Do not send external notifications.
schedule: "*/5 * * * *"
---

# Ping

A minimal diagnostic Wobblie that runs every 5 minutes. Its only job is to confirm that the scheduling and activation system is working. If this Wobblie stops producing activations, something is wrong with the runtime.

## Behavior

On each scheduled run:

1. Log a message: `ping: alive at {ISO timestamp}`
2. Exit successfully.

No actions are taken. No external systems are contacted. This Wobblie exists purely to verify end-to-end scheduling health.
