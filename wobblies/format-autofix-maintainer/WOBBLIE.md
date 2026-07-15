---
id: format-autofix-maintainer
purpose: Keep the codebase consistently formatted by opening one scheduled formatting-only pull request when drift is found.
schedule: '0 7 * * 1'
routines:
  - Install dependencies and run `{{adapt.format_command}}` across the repository in the sandbox.
  - Keep the changes to formatting and safe lint autofixes only, with no behavioral or logic edits.
  - Open one pull request with the formatting changes and a short summary when the working tree is not clean.
deny:
  - Do not make logic, dependency, or behavioral changes.
  - Do not edit generated files, vendored or third-party directories, or lockfiles.
  - Do not modify tests to make checks pass.
  - Do not open more than one formatting pull request at a time.
  - Do not open a pull request when the formatter produced no changes.
---

# Format Autofix Maintainer

## Overview

Runs the repository's formatter on a weekly schedule and, when it finds drift, opens a single formatting-only pull request. It keeps style consistent without asking every contributor to remember to run the formatter.

## Policy

Changes must be formatting or safe lint autofixes only — no logic, dependency, or behavioral edits. If applying the formatter would touch generated output, vendored code, or lockfiles, leave those files alone. When the working tree is already clean, do nothing.

## Limits

At most one open formatting pull request at a time. Keep the diff reviewable and the summary short. Never adjust tests or configuration to force a green result.
