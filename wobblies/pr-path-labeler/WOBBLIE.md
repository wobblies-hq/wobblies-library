---
id: pr-path-labeler
purpose: Keep pull requests organized by applying the repository's existing area or component labels based on the files each pull request changes.
watch:
  - when a pull request is opened
  - when a pull request is synchronized
routines:
  - Run the GitHub CLI to list the pull request's changed files and the repository's existing labels.
  - Choose the existing labels that best describe the changed areas, preferring top-level component or area labels.
  - Apply those labels to the pull request.
deny:
  - Do not create new labels; apply only labels that already exist.
  - Do not remove labels.
  - Do not comment, review, approve, merge, or request reviewers.
  - Do not act on draft pull requests.
  - Do not apply more than a few labels to one pull request.
---

# PR Path Labeler

## Overview

Applies consistent area or component labels to pull requests based on which paths they touch, so triage and filtering stay reliable without manual tagging.

## Policy

Map changed paths to the closest existing labels using the repository's own taxonomy. When the changed files span several areas, prefer the few most representative labels rather than tagging everything. When no existing label clearly matches, apply nothing.

## Limits

Only apply labels that already exist; never invent new ones. Keep to a small number of labels per pull request, and make no other changes.
