---
id: stale-issue-warden
purpose: Keep the open-issue list current by warning on inactive issues and closing them only after a grace period.
schedule: '0 8 * * 1'
routines:
  - Run the GitHub CLI to list open issues with no activity for at least {{adapt.inactivity_days}} days.
  - Comment a single stale warning and apply the stale label on newly inactive issues that have not been warned before.
  - Close issues that were already warned and stayed inactive for a further {{adapt.grace_days}} days.
deny:
  - Do not close an issue that has not received a prior stale warning.
  - Do not act on issues carrying an exempt label such as pinned, security, roadmap, or keep-open.
  - Do not remove labels a human applied.
  - Do not touch more than 20 issues in a single run.
  - Do not reopen issues or act on pull requests.
---

# Stale Issue Warden

## Overview

Runs weekly to keep the open-issue backlog honest: it warns once on issues that have gone quiet, then closes them only if they stay inactive through a grace period. Every close is preceded by a visible warning, so nothing disappears silently.

## Policy

Warn before closing, always. Treat the inactivity window ({{adapt.inactivity_days}} days) and grace period ({{adapt.grace_days}} days) as hard thresholds. Skip any issue that carries an exempt label. When in doubt about whether an issue is truly inactive, leave it alone.

## Limits

Touch at most 20 issues per run to keep activations small and reviewable. Never reopen issues, never remove human labels, and never act on pull requests.
