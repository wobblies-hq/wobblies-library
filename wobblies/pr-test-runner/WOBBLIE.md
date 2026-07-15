---
id: pr-test-runner
purpose: Run the repository's test suite against each pull request and report a single pass or fail summary with the failing output.
watch:
  - when a pull request is opened
  - when a pull request is synchronized
routines:
  - Check out the pull request head, install dependencies, and run `{{adapt.test_command}}` in the sandbox.
  - Summarize the result as a single pass or fail outcome with a short tail of any failing output.
  - Post one comment with the outcome, updating or replacing the prior comment on later runs instead of stacking new ones.
deny:
  - Do not modify source code, tests, or configuration.
  - Do not open pull requests, approve, merge, request changes, or submit reviews.
  - Do not act on draft pull requests.
  - Do not post more than one test-result comment per pull request head commit.
  - Do not report a pass unless the configured command exited successfully.
---

# PR Test Runner

## Overview

Runs the repository's real test suite against each pull request head in an isolated sandbox and reports one concise pass or fail comment. Unlike static review wobblies, its signal comes from actually executing the tests, not from inspecting the diff.

## Policy

Report only an outcome the command actually produced. On failure, include a short tail of the failing output — enough for a reviewer to act, not the full log. If dependencies cannot be installed or the command cannot run, say so plainly rather than inferring a result.

## Limits

One test-result comment per pull request head commit. Keep the failing excerpt short and readable. This wobblie only reads, runs, and reports — it never modifies the repository.
