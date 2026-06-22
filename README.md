# wobblies-library

[![Release](https://img.shields.io/github/v/tag/wobblie-hq/wobblies-library?label=release&sort=semver)](https://github.com/wobblie-hq/wobblies-library/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/wobblie-hq/wobblies-library/release.yml?label=ci)](https://github.com/wobblie-hq/wobblies-library/actions)

This repo contains example wobblie files for common wobblie patterns.

These examples are reference patterns for wobblies. They are not the normative source of truth for the wobblie format or for authoring rules.

## Start here

Start with the docs:

- [Wobblies](https://docs.wobblies.ai/wobblies)
- [Choosing wobblies](https://docs.wobblies.ai/wobblies/choosing-wobblies)
- [Writing and editing WOBBLIE.md](https://docs.wobblies.ai/wobblies/writing-and-editing-wobblie-md)
- [WOBBLIE.md reference](https://docs.wobblies.ai/wobblies/wobblie-md-reference)
- [Testing and iterating on wobblies](https://docs.wobblies.ai/wobblies/testing-and-iterating-on-wobblies)

For this repo's examples package, CLI, and catalog contract, use:

- [Wobblie catalog CLI](docs/wobblie-cli.md)
- [Examples v2 package and catalog spec](docs/examples-spec.md)
- [Examples authoring guide](docs/examples-authoring-guide.md)
- [Examples catalog consumer guide](docs/examples-catalog-consumer-guide.md)

Read [Wobblies](https://docs.wobblies.ai/wobblies) first if you are new to the concept.

Use [WOBBLIE.md reference](https://docs.wobblies.ai/wobblies/wobblie-md-reference) for the exact authored contract and [Testing and iterating on wobblies](https://docs.wobblies.ai/wobblies/testing-and-iterating-on-wobblies) for testing and rollout guidance.

## Example index

| Category | Wobblie ID | Path | Description |
| --- | --- | --- | --- |
| Dependency maintenance | `js-ts-dependency-upgrades` | [wobblies/js-ts-dependency-upgrades/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/js-ts-dependency-upgrades/WOBBLIE.md) | Opens low-noise JavaScript/TypeScript dependency upgrade PRs with a configured package manager. |
| Documentation freshness | `docs-drift-maintainer` | [wobblies/docs-drift-maintainer/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/docs-drift-maintainer/WOBBLIE.md) | Repairs docs drift from recent merged source changes with small source-backed PRs. |
| Documentation freshness | `docs-stale-maintainer` | [wobblies/docs-stale-maintainer/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/docs-stale-maintainer/WOBBLIE.md) | Runs weekly to repair older outdated documentation in small source-backed PRs with a hard size limit. |
| GitHub activity reporting | `github-activity-digest` | [wobblies/github-activity-digest/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/github-activity-digest/WOBBLIE.md) | Posts a low-noise scheduled digest of meaningful pull request and CI activity. |
| Linear issue hygiene | `linear-bug-context-researcher` | [wobblies/linear-bug-context-researcher/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/linear-bug-context-researcher/WOBBLIE.md) | Adds concise repo-aware triage context to newly created Linear bugs and regressions. |
| Linear issue hygiene | `linear-issue-duplicate-finder` | [wobblies/linear-issue-duplicate-finder/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/linear-issue-duplicate-finder/WOBBLIE.md) | Suggests likely duplicate or related Linear issues when new issues are created. |
| Linear issue hygiene | `linear-issue-labeler` | [wobblies/linear-issue-labeler/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/linear-issue-labeler/WOBBLIE.md) | Keeps recently changed Linear issues aligned with the current Linear label set. |
| Linear issue hygiene | `linear-pr-link-reconciler` | [wobblies/linear-pr-link-reconciler/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/linear-pr-link-reconciler/WOBBLIE.md) | Finds likely GitHub code work for Linear issues and asks for confirmation without editing links automatically. |
| PR check repair | `pr-check-repair` | [wobblies/pr-check-repair/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/pr-check-repair/WOBBLIE.md) | Repairs failing GitHub-visible PR checks with focused evidence-grounded commits, flaky reruns, or low-noise blocked comments. |
| PR merge conflict repair | `pr-merge-conflict-repair` | [wobblies/pr-merge-conflict-repair/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/pr-merge-conflict-repair/WOBBLIE.md) | Repairs clear merge conflicts on non-draft GitHub pull requests after target base branch changes, with focused verification and low-noise blocked comments. |
| PR metadata management | `pr-metadata` | [wobblies/pr-metadata/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/pr-metadata/WOBBLIE.md) | Keeps PR title/body metadata complete, current, and linked to the correct issue item. |
| PR review triage | `pr-review-triage` | [wobblies/pr-review-triage/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/pr-review-triage/WOBBLIE.md) | Triages PR review threads and top-level PR comments for merge-readiness, duplicate feedback, fixed items, and safe low-noise follow-up. |
| Slack operations | `slack-alert-context-researcher` | [wobblies/slack-alert-context-researcher/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/slack-alert-context-researcher/WOBBLIE.md) | Replies to alert-like Slack bot messages with compact GitHub and incident context for triage. |
| Slack planning | `slack-meeting-followup-planner` | [wobblies/slack-meeting-followup-planner/WOBBLIE.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblies/slack-meeting-followup-planner/WOBBLIE.md) | Turns Slack meeting notes or transcripts into concise, repo-aware follow-up options Wobblie can help execute. |

## Generated examples catalog

The root `examples.json` file is generated from each `wobblies/<id>/example.yml`, `WOBBLIE.md`, and supported files under `scripts/**` and `references/**`.

## Node examples API

Node consumers can import the packaged catalog API without shelling out to the CLI:

```ts
import {
  createWobblieInstallPullRequest,
  getWobblieExample,
  listWobblieExamples,
  listWobblieInstallPullRequests,
  loadWobblieExamplesCatalog,
} from "@wobblies/library";

const catalog = await loadWobblieExamplesCatalog();
const examples = await listWobblieExamples();
const example = await getWobblieExample("js-ts-dependency-upgrades");

await createWobblieInstallPullRequest({
  repo: "owner/repo",
  exampleId: "js-ts-dependency-upgrades",
  base: "main",
  adaptations: { package_manager: "pnpm" },
});

await listWobblieInstallPullRequests({ repo: "owner/repo" });
```

The catalog APIs read the package-root `examples.json`, so they work from the built npm package. The install-PR APIs render from the same catalog contract and use GitHub authentication through an explicit token/client or `GITHUB_TOKEN` / `GH_TOKEN`.

## Wobblie catalog CLI

This package is npm-ready as `@wobblies/library` and exposes the `wobblie` binary.

Use it to browse the public examples catalog, safely scaffold catalog examples into `.agents/wobblies/<id>/`, and validate runtime wobblie files:

```bash
wobblie list

wobblie show js-ts-dependency-upgrades --json

wobblie add js-ts-dependency-upgrades --dry-run --adapt package_manager=pnpm

wobblie pr open js-ts-dependency-upgrades --repo owner/repo --base main --adapt package_manager=pnpm

wobblie pr list --repo owner/repo

wobblie validate .agents/wobblies/js-ts-dependency-upgrades/WOBBLIE.md

wobblie validate --all --json
```

Key safety defaults:

- catalog reads default to `master` and support `--ref <sha|branch|tag>`;
- install copies only catalog-listed `WOBBLIE.md`, `scripts[]`, and `references[]` files from the same ref;
- install never copies `example.yml` or crawls upstream directories;
- install plans include destination paths and file modes (`100644`/`100755`);
- existing destination directories/files require `--force`;
- deprecated examples require `--allow-deprecated`;
- show surfaces structured `adaptations[]` and optional `specializationIdeas[]`, and add/install/PR-open render `{{adapt.key}}` tokens with string-only values before validation;
- `wobblie pr open` writes an atomic GitHub commit on a deterministic `wobblie/wobblie-installs/<example-id>` branch, opens an install PR, and records only adaptation keys (not raw values) in the hidden PR marker and CLI output;
- scaffolding does not activate a wobblie until the change is merged and ingested by Wobblie.

See [Wobblie catalog CLI](docs/wobblie-cli.md) for command details, JSON envelope, validation semantics, and exit codes.

For release instructions, see [Releasing `@wobblies/library`](RELEASING.md).


Use [Examples v2 package and catalog spec](docs/examples-spec.md) for the exact package, metadata, generation, validation, and public-safety contract. Use [Examples authoring guide](docs/examples-authoring-guide.md) for author/reviewer guidance. Use [Examples catalog consumer guide](docs/examples-catalog-consumer-guide.md) for website, dashboard, and install consumer guidance.

Use the repo-owned checks before changing examples:

```bash
bun install
bun run generate:examples
bun run validate:examples
bun run test
```

`examples.json` is deterministic and should be committed whenever example packages change.

## How to use this repo

Use this repo to:

- find the nearest example pattern
- calibrate scope and level of specificity
- compare watch-driven, schedule-driven, and hybrid shapes
- adapt a proven structure to your repo’s real maintenance role

Do not assume an example can be copied directly into your repo without changes.

The docs are the source of truth for:

- [what wobblies are](https://docs.wobblies.ai/wobblies)
- [what fields exist](https://docs.wobblies.ai/wobblies/wobblie-md-reference)
- [what the validation rules are](https://docs.wobblies.ai/wobblies/wobblie-md-reference)
- [what good wobblie files look like](https://docs.wobblies.ai/wobblies/writing-and-editing-wobblie-md)
- [how to test and iterate safely](https://docs.wobblies.ai/wobblies/testing-and-iterating-on-wobblies)

Use the docs for concept, contract, and authoring guidance. Use this repo for concrete patterns.

## How Wobblie should use these examples

When choosing wobblies:

- use [Choosing wobblies](https://docs.wobblies.ai/wobblies/choosing-wobblies) and the `Example index` to find the nearest pattern.

When creating or editing wobblie files:

- use [Writing and editing WOBBLIE.md](https://docs.wobblies.ai/wobblies/writing-and-editing-wobblie-md) and [WOBBLIE.md reference](https://docs.wobblies.ai/wobblies/wobblie-md-reference), and treat examples as reference patterns rather than source of truth.
- use [Examples authoring guide](docs/examples-authoring-guide.md) when adding or reviewing example packages in this repo.
