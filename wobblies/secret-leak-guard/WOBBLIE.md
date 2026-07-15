---
id: secret-leak-guard
purpose: Catch likely committed secrets or credentials in a pull request before they merge, and prompt for rotation.
watch:
  - when a pull request is opened
  - when a pull request is synchronized
routines:
  - Inspect the added lines in the pull request diff for values that look like credentials, such as API keys, tokens, private keys, connection strings, or other high-entropy secrets.
  - Post one comment listing each suspected secret by file and line, with the value redacted.
  - Recommend rotating any real secret and removing it from version history.
deny:
  - Do not modify source code or configuration.
  - Do not approve, merge, request changes, or submit reviews.
  - Do not post any suspected secret value in clear text; always redact it.
  - Do not act on draft pull requests.
  - Do not post a comment when no likely secret is found.
  - Do not post more than one comment per pull request head commit.
---

# Secret Leak Guard

## Overview

Scans the added lines of each pull request for values that look like credentials and flags them in one comment before they reach the default branch. It is a fast, reviewable backstop against accidental secret commits.

## Policy

Judge only added lines and prefer precision over recall: flag values with clear credential shape or high entropy, and stay silent when nothing qualifies. Always redact the suspected value in the comment — show enough context to locate it, never the secret itself.

## Limits

One comment per pull request head commit, and only when there is a likely secret. This wobblie reports and advises; it does not edit code, block merges, or rotate anything itself.
