---
id: first-response-triage
purpose: Give every newly opened issue a fast, consistent first response by classifying it, applying a type label, and requesting any missing details.
watch:
  - when an issue is opened
routines:
  - Classify the new issue as a bug, feature request, question, or unclear from its title and body.
  - Apply the matching existing type label when the repository has one.
  - Post one short comment that acknowledges the issue and, for suspected bugs, asks for any missing reproduction steps, version, or environment details.
deny:
  - Do not close, assign, prioritize, or set milestones.
  - Do not create new labels; apply only labels that already exist.
  - Do not act on issues opened by Wobblie.
  - Do not post more than one comment per issue.
---

# First Response Triage

## Overview

Gives new issues an immediate, uniform first touch: a type label and a short acknowledging comment that pulls for the details a maintainer will need. It shortens time-to-first-response and improves the quality of incoming reports.

## Policy

Classify from the issue text only; when the type is unclear, apply no label and keep the comment to a plain acknowledgement. For suspected bugs, ask only for the specific details that are actually missing rather than a generic checklist.

## Limits

One comment per issue, using existing labels only. This wobblie never closes, assigns, or prioritizes — those decisions stay with maintainers.
