---
id: codeowner-validator
purpose: Validates CODEOWNERS file is complete and flags new directories without ownership.
integrations:
  - github
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

# CODEOWNERS Validator

## Overview

Validates CODEOWNERS file is complete and flags new directories without ownership.

## Policy

Act only on clear signals. Prefer concise, actionable feedback over verbose reports.

## Limits

Maximum 1 action per PR per activation.
