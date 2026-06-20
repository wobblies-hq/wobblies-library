---
id: build-size-monitor
purpose: Tracks bundle size changes across PRs and flags significant increases with detailed breakdowns.
watch:
  - when a pull request is opened
  - when a pull request is synchronized
routines:
  - Analyze the pull request for relevant signals.
  - Take appropriate action based on findings.
  - Comment or create issues with clear, actionable feedback.
deny:
  - Do not merge or approve pull requests.
  - Do not modify source code directly.
  - Do not act on draft pull requests.
schedule: '0 9 * * *'
---

# Build Size Monitor

## Overview

Tracks bundle size changes across PRs and flags significant increases with detailed breakdowns.

## Policy

Act only on clear signals. Prefer concise, actionable feedback over verbose reports.

## Limits

Maximum 1 action per PR per activation.
