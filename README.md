# wobblies-library

[![Release](https://img.shields.io/github/v/tag/wobblie-hq/wobblies-library?label=release&sort=semver)](https://github.com/wobblie-hq/wobblies-library/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/wobblie-hq/wobblies-library/release.yml?label=ci)](https://github.com/wobblie-hq/wobblies-library/actions)

This repo contains example wobbly files for common wobbly patterns.

These examples are reference patterns for wobblies. They are not the normative source of truth for the wobbly format or for authoring rules.

## Start here

Start with the docs:

- [Wobblys](https://docs.wobblies.ai/wobblys)
- [Choosing wobblys](https://docs.wobblies.ai/wobblys/choosing-wobblys)
- [Writing and editing WOBBLY.md](https://docs.wobblies.ai/wobblys/writing-and-editing-wobbly-md)
- [WOBBLY.md reference](https://docs.wobblies.ai/wobblys/wobbly-md-reference)
- [Testing and iterating on wobblys](https://docs.wobblies.ai/wobblys/testing-and-iterating-on-wobblys)

For this repo's examples package, CLI, and catalog contract, use:

- [Wobbly catalog CLI](docs/wobbly-cli.md)
- [Examples v2 package and catalog spec](docs/examples-spec.md)
- [Examples authoring guide](docs/examples-authoring-guide.md)
- [Examples catalog consumer guide](docs/examples-catalog-consumer-guide.md)

Read [Wobblys](https://docs.wobblies.ai/wobblys) first if you are new to the concept.

Use [WOBBLY.md reference](https://docs.wobblies.ai/wobblys/wobbly-md-reference) for the exact authored contract and [Testing and iterating on wobblys](https://docs.wobblies.ai/wobblys/testing-and-iterating-on-wobblys) for testing and rollout guidance.

## Example index

| Category | Wobbly ID | Path | Description |
| --- | --- | --- | --- |
| Dependency maintenance | `js-ts-dependency-upgrades` | [wobblys/js-ts-dependency-upgrades/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/js-ts-dependency-upgrades/WOBBLY.md) | Opens low-noise JavaScript/TypeScript dependency upgrade PRs with a configured package manager. |
| Documentation freshness | `docs-drift-maintainer` | [wobblys/docs-drift-maintainer/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/docs-drift-maintainer/WOBBLY.md) | Repairs docs drift from recent merged source changes with small source-backed PRs. |
| Documentation freshness | `docs-stale-maintainer` | [wobblys/docs-stale-maintainer/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/docs-stale-maintainer/WOBBLY.md) | Runs weekly to repair older outdated documentation in small source-backed PRs with a hard size limit. |
| GitHub activity reporting | `github-activity-digest` | [wobblys/github-activity-digest/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/github-activity-digest/WOBBLY.md) | Posts a low-noise scheduled digest of meaningful pull request and CI activity. |
| Linear issue hygiene | `linear-bug-context-researcher` | [wobblys/linear-bug-context-researcher/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/linear-bug-context-researcher/WOBBLY.md) | Adds concise repo-aware triage context to newly created Linear bugs and regressions. |
| Linear issue hygiene | `linear-issue-duplicate-finder` | [wobblys/linear-issue-duplicate-finder/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/linear-issue-duplicate-finder/WOBBLY.md) | Suggests likely duplicate or related Linear issues when new issues are created. |
| Linear issue hygiene | `linear-issue-labeler` | [wobblys/linear-issue-labeler/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/linear-issue-labeler/WOBBLY.md) | Keeps recently changed Linear issues aligned with the current Linear label set. |
| Linear issue hygiene | `linear-pr-link-reconciler` | [wobblys/linear-pr-link-reconciler/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/linear-pr-link-reconciler/WOBBLY.md) | Finds likely GitHub code work for Linear issues and asks for confirmation without editing links automatically. |
| PR check repair | `pr-check-repair` | [wobblys/pr-check-repair/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/pr-check-repair/WOBBLY.md) | Repairs failing GitHub-visible PR checks with focused evidence-grounded commits, flaky reruns, or low-noise blocked comments. |
| PR merge conflict repair | `pr-merge-conflict-repair` | [wobblys/pr-merge-conflict-repair/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/pr-merge-conflict-repair/WOBBLY.md) | Repairs clear merge conflicts on non-draft GitHub pull requests after target base branch changes, with focused verification and low-noise blocked comments. |
| PR metadata management | `pr-metadata` | [wobblys/pr-metadata/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/pr-metadata/WOBBLY.md) | Keeps PR title/body metadata complete, current, and linked to the correct issue item. |
| PR review triage | `pr-review-triage` | [wobblys/pr-review-triage/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/pr-review-triage/WOBBLY.md) | Triages PR review threads and top-level PR comments for merge-readiness, duplicate feedback, fixed items, and safe low-noise follow-up. |
| Slack operations | `slack-alert-context-researcher` | [wobblys/slack-alert-context-researcher/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/slack-alert-context-researcher/WOBBLY.md) | Replies to alert-like Slack bot messages with compact GitHub and incident context for triage. |
| Slack planning | `slack-meeting-followup-planner` | [wobblys/slack-meeting-followup-planner/WOBBLY.md](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/slack-meeting-followup-planner/WOBBLY.md) | Turns Slack meeting notes or transcripts into concise, repo-aware follow-up options Wobbly can help execute. |

## Generated examples catalog

The root `examples.json` file is generated from each `wobblys/<id>/example.yml`, `WOBBLY.md`, and supported files under `scripts/**` and `references/**`.

## Node examples API

Node consumers can import the packaged catalog API without shelling out to the CLI:

```ts
import {
  createWobblyInstallPullRequest,
  getWobblyExample,
  listWobblyExamples,
  listWobblyInstallPullRequests,
  loadWobblyExamplesCatalog,
} from "@wobblies/library";

const catalog = await loadWobblyExamplesCatalog();
const examples = await listWobblyExamples();
const example = await getWobblyExample("js-ts-dependency-upgrades");

await createWobblyInstallPullRequest({
  repo: "owner/repo",
  exampleId: "js-ts-dependency-upgrades",
  base: "main",
  adaptations: { package_manager: "pnpm" },
});

await listWobblyInstallPullRequests({ repo: "owner/repo" });
```

The catalog APIs read the package-root `examples.json`, so they work from the built npm package. The install-PR APIs render from the same catalog contract and use GitHub authentication through an explicit token/client or `GITHUB_TOKEN` / `GH_TOKEN`.

## Wobbly catalog CLI

This package is npm-ready as `@wobblies/library` and exposes the `wobbly` binary.

Use it to browse the public examples catalog, safely scaffold catalog examples into `.agents/wobblys/<id>/`, and validate runtime wobbly files:

```bash
wobbly list

wobbly show js-ts-dependency-upgrades --json

wobbly add js-ts-dependency-upgrades --dry-run --adapt package_manager=pnpm

wobbly pr open js-ts-dependency-upgrades --repo owner/repo --base main --adapt package_manager=pnpm

wobbly pr list --repo owner/repo

wobbly validate .agents/wobblys/js-ts-dependency-upgrades/WOBBLY.md

wobbly validate --all --json
```

Key safety defaults:

- catalog reads default to `master` and support `--ref <sha|branch|tag>`;
- install copies only catalog-listed `WOBBLY.md`, `scripts[]`, and `references[]` files from the same ref;
- install never copies `example.yml` or crawls upstream directories;
- install plans include destination paths and file modes (`100644`/`100755`);
- existing destination directories/files require `--force`;
- deprecated examples require `--allow-deprecated`;
- show surfaces structured `adaptations[]` and optional `specializationIdeas[]`, and add/install/PR-open render `{{adapt.key}}` tokens with string-only values before validation;
- `wobbly pr open` writes an atomic GitHub commit on a deterministic `wobbly/wobbly-installs/<example-id>` branch, opens an install PR, and records only adaptation keys (not raw values) in the hidden PR marker and CLI output;
- scaffolding does not activate a wobbly until the change is merged and ingested by Wobbly.

See [Wobbly catalog CLI](docs/wobbly-cli.md) for command details, JSON envelope, validation semantics, and exit codes.

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

- [what wobblys are](https://docs.wobblies.ai/wobblys)
- [what fields exist](https://docs.wobblies.ai/wobblys/wobbly-md-reference)
- [what the validation rules are](https://docs.wobblies.ai/wobblys/wobbly-md-reference)
- [what good wobbly files look like](https://docs.wobblies.ai/wobblys/writing-and-editing-wobbly-md)
- [how to test and iterate safely](https://docs.wobblies.ai/wobblys/testing-and-iterating-on-wobblys)

Use the docs for concept, contract, and authoring guidance. Use this repo for concrete patterns.

## How Wobbly should use these examples

When choosing wobblys:

- use [Choosing wobblys](https://docs.wobblies.ai/wobblys/choosing-wobblys) and the `Example index` to find the nearest pattern.

When creating or editing wobbly files:

- use [Writing and editing WOBBLY.md](https://docs.wobblies.ai/wobblys/writing-and-editing-wobbly-md) and [WOBBLY.md reference](https://docs.wobblies.ai/wobblys/wobbly-md-reference), and treat examples as reference patterns rather than source of truth.
- use [Examples authoring guide](docs/examples-authoring-guide.md) when adding or reviewing example packages in this repo.
