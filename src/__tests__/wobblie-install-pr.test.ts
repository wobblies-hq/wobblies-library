import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { executeCli } from '../wobblie-cli/cli';
import type { CatalogClient } from '../wobblie-cli/types';
import {
  WOBBLIE_INSTALL_BRANCH_PREFIX,
  WobblieInstallPullRequestError,
  createWobblieInstallMarker,
  createWobblieInstallPullRequest,
  listWobblieInstallPullRequests,
  parseWobblieInstallMarker,
  type WobblieInstallPrGitHubClient,
} from '../wobblie-install-pr';
import type { ExamplesCatalog } from '../examples/types';

const templatedWobblie = `---
id: templated-wobblie
purpose: Keep {{adapt.required_value}} healthy.
watch:
  - when {{adapt.required_value}} changes
routines:
  - run {{adapt.optional_value}} checks
deny:
  - do not expose raw adaptation values in CLI output
schedule: "0 9 * * 1"
---

# Templated wobblie

Target: {{adapt.required_value}}
Optional: {{adapt.optional_value}}
`;

const catalog: ExamplesCatalog = {
  schemaVersion: 2,
  source: {
    repository: 'wobblie-hq/wobblies-library',
    baseDirectory: 'wobblies',
  },
  examples: [
    {
      id: 'templated-wobblie',
      title: 'Templated wobblie',
      status: 'ready',
      summary: 'A wobblie fixture with structured adaptations.',
      readiness: 'adapt-before-use',
      showOnWebsite: true,
      showInDashboard: true,
      fit: {
        jobsToBeDone: ['operate'],
        bestFor: ['tests with adaptation values'],
        notFor: ['production without edits'],
      },
      requirements: {
        requiredIntegrations: ['github'],
        optionalIntegrations: ['linear'],
        other: [],
      },
      adaptations: [
        {
          key: 'required_value',
          label: 'Required value',
          description: 'Required string rendered into the wobblie and support files.',
          required: true,
        },
        {
          key: 'optional_value',
          label: 'Optional value',
          description: 'Optional string rendered into the wobblie and support files.',
          required: false,
          default: 'from-default',
        },
      ],
      specializationIdeas: [],
      wobblie: {
        path: 'WOBBLIE.md',
        content: templatedWobblie,
      },
      scripts: ['scripts/render.sh'],
      references: ['references/render.md'],
      source: {
        directory: 'wobblies/templated-wobblie',
        url: 'https://github.com/wobblie-hq/wobblies-library/tree/master/wobblies/templated-wobblie',
      },
    },
  ],
};

const catalogClient: CatalogClient = {
  async loadCatalog(): Promise<ExamplesCatalog> {
    return catalog;
  },
  async readTextFile(_ref: string, path: string): Promise<string> {
    if (path === 'wobblies/templated-wobblie/scripts/render.sh') {
      return '#!/usr/bin/env bash\necho {{adapt.required_value}} {{adapt.optional_value}}\n';
    }
    if (path === 'wobblies/templated-wobblie/references/render.md') {
      return '# Rendered\n\nTarget: {{adapt.required_value}}\nOptional: {{adapt.optional_value}}\n';
    }
    throw new Error(`unexpected catalog path ${path}`);
  },
};

function catalogClientWithIntegrations(args: {
  requiredIntegrations: ExamplesCatalog['examples'][number]['requirements']['requiredIntegrations'];
  optionalIntegrations: ExamplesCatalog['examples'][number]['requirements']['optionalIntegrations'];
}): CatalogClient {
  const example = catalog.examples[0]!;
  const testCatalog: ExamplesCatalog = {
    ...catalog,
    examples: [
      {
        ...example,
        requirements: {
          ...example.requirements,
          requiredIntegrations: args.requiredIntegrations,
          optionalIntegrations: args.optionalIntegrations,
        },
      },
    ],
  };

  return {
    ...catalogClient,
    async loadCatalog(): Promise<ExamplesCatalog> {
      return testCatalog;
    },
  };
}

type RecordedCall = {
  method: string;
  path: string;
  options: unknown;
};

function createdPullRequestBody(calls: RecordedCall[]): string {
  const pullCall = calls.find((call) => call.method === 'POST' && call.path.endsWith('/pulls'));
  expect(pullCall).toBeDefined();
  return (pullCall!.options as { body: { body: string } }).body.body;
}

function integrationsSection(body: string): string {
  const start = body.indexOf('## Integrations and setup');
  const end = body.indexOf('## Review and iterate before merging');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return body.slice(start, end);
}

function githubError(status: number, message: string): Error & { status: number; response: { status: number } } {
  const error = new Error(message) as Error & { status: number; response: { status: number } };
  error.status = status;
  error.response = { status };
  return error;
}

function gitBlobSha(content: string): string {
  const buffer = Buffer.from(content, 'utf8');
  return createHash('sha1')
    .update(Buffer.from(`blob ${buffer.length.toString()}\0`, 'utf8'))
    .update(buffer)
    .digest('hex');
}

function makePull(args: {
  number: number;
  branch: string;
  sha: string;
  state?: string;
  mergedAt?: string | null;
  body?: string | null;
  base?: string;
  title?: string;
}) {
  return {
    number: args.number,
    title: args.title ?? `Install ${args.branch}`,
    html_url: `https://github.com/acme/widgets/pull/${args.number.toString()}`,
    state: args.state ?? 'open',
    merged_at: args.mergedAt ?? null,
    body: args.body ?? null,
    head: { ref: args.branch, sha: args.sha },
    base: { ref: args.base ?? 'main' },
  };
}

function successGithubClient(): WobblieInstallPrGitHubClient & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const client: WobblieInstallPrGitHubClient & { calls: RecordedCall[] } = {
    calls,
    async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
      calls.push({ method, path: requestPath, options });
      if (method === 'GET' && requestPath.endsWith('/git/ref/heads/wobblie/wobblie-installs/templated-wobblie')) {
        throw githubError(404, 'branch missing');
      }
      if (method === 'GET' && requestPath.endsWith('/git/ref/heads/main')) {
        return { ref: 'refs/heads/main', object: { sha: 'base-sha', type: 'commit' } } as T;
      }
      if (method === 'GET' && requestPath.endsWith('/git/commits/base-sha')) {
        return { sha: 'base-sha', tree: { sha: 'base-tree' } } as T;
      }
      if (method === 'GET' && requestPath.endsWith('/git/trees/base-tree')) {
        return { sha: 'base-tree', tree: [] } as T;
      }
      if (method === 'POST' && requestPath.endsWith('/git/trees')) {
        return { sha: 'created-tree', tree: [] } as T;
      }
      if (method === 'POST' && requestPath.endsWith('/git/commits')) {
        return { sha: 'created-commit', tree: { sha: 'created-tree' } } as T;
      }
      if (method === 'POST' && requestPath.endsWith('/git/refs')) {
        return { ref: 'refs/heads/wobblie/wobblie-installs/templated-wobblie', object: { sha: 'created-commit', type: 'commit' } } as T;
      }
      if (method === 'POST' && requestPath.endsWith('/pulls')) {
        const body = (options as { body: { body: string } }).body.body;
        return makePull({
          number: 42,
          branch: 'wobblie/wobblie-installs/templated-wobblie',
          sha: 'created-commit',
          body,
          title: 'Install templated-wobblie wobblie',
        }) as T;
      }
      throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
    },
  };
  return client;
}

describe('wobblie install PR API', () => {
  test('creates a deterministic branch, atomic commit, educational PR body, and hidden marker without raw adaptation values', async () => {
    const githubClient = successGithubClient();

    const result = await createWobblieInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobblie',
      base: 'main',
      sourceRef: 'test-ref',
      adaptations: { required_value: 'secret-target', optional_value: 'secret-option' },
      catalogClient,
      githubClient,
    });

    expect(result.status).toBe('created');
    expect(result.repository).toBe('acme/widgets');
    expect(result.baseBranch).toBe('main');
    expect(result.headBranch).toBe(`${WOBBLIE_INSTALL_BRANCH_PREFIX}templated-wobblie`);
    expect(result.headSha).toBe('created-commit');
    expect(result.filesPlanned.map((file) => file.destinationPath)).toEqual([
      '.agents/wobblies/templated-wobblie/WOBBLIE.md',
      '.agents/wobblies/templated-wobblie/scripts/render.sh',
      '.agents/wobblies/templated-wobblie/references/render.md',
    ]);
    expect(result.adaptationsApplied).toEqual(['optional_value', 'required_value']);
    expect(result.markerText).toContain('wobblie-wobblie-install-v1');
    expect(result.markerText).toContain('required_value');
    expect(result.markerText).not.toContain('secret-target');
    expect(result.markerText).not.toContain('secret-option');
    expect(result.pullRequest.url).toBe('https://github.com/acme/widgets/pull/42');

    const createTreeCall = githubClient.calls.find((call) => call.method === 'POST' && call.path.endsWith('/git/trees'));
    expect(createTreeCall).toBeDefined();
    expect(createTreeCall?.options).toMatchObject({
      body: {
        base_tree: 'base-tree',
        tree: expect.arrayContaining([
          expect.objectContaining({ path: '.agents/wobblies/templated-wobblie/WOBBLIE.md', mode: '100644', type: 'blob' }),
          expect.objectContaining({ path: '.agents/wobblies/templated-wobblie/scripts/render.sh', mode: '100755', type: 'blob' }),
        ]),
      },
    });

    const pullCall = githubClient.calls.find((call) => call.method === 'POST' && call.path.endsWith('/pulls'));
    const pullBody = (pullCall?.options as { body: { body: string } }).body.body;
    expect(pullBody).toBe(`## Summary

This PR installs the \`templated-wobblie\` Wobblie wobblie to \`.agents/wobblies/templated-wobblie/WOBBLIE.md\`. It was generated by Wobblie from the [\`templated-wobblie\` example](https://github.com/wobblie-hq/wobblies-library/blob/master/wobblies/templated-wobblie/WOBBLIE.md).

The wobblie won't start working until it's merged to the repo's default branch.

## What Wobblie wobblies are

Wobblie is an async engineering teammate that works in the tools your team already uses. In GitHub, Wobblie can inspect code, review changes, propose patches, open PRs, and comment with findings. With connected integrations, Wobblie can also use Linear, Slack, and Sentry context to understand issues, conversations, alerts, and follow-up work.

A wobblie is a recurring role for Wobblie. Instead of waiting for someone to mention Wobblie every time the same kind of maintenance work appears, the repo contains a small role definition that tells Wobblie when to wake up and what job to do.

This PR adds that role at \`.agents/wobblies/templated-wobblie/WOBBLIE.md\`. The file controls:

- when Wobblie can activate, through \`watch\` conditions or a \`schedule\`
- what work Wobblie should perform, through \`purpose\` and \`routines\`
- what Wobblie should avoid, through \`deny\` rules and body guidance

After this PR is merged and Wobblie ingests the default-branch version, the wobblie can start handling that recurring work inside the limits defined in \`WOBBLIE.md\`.

Learn more: https://docs.wobblies.ai/wobblies

## What this wobblie does

\`WOBBLIE.md\` purpose:

> Keep secret-target healthy.

This wobblie’s configured routines are:

- run secret-option checks

## When this wobblie can activate

This PR only installs wobblie files. The wobblie becomes eligible for live activations after both are true:

1. this PR is merged to the repo's default branch
2. Wobblie ingests the merged default-branch version of \`WOBBLIE.md\`

### Watch conditions

Wobblie may wake this wobblie when these \`watch\` conditions match:

- when secret-target changes

### Schedule

Wobblie may also wake this wobblie on this \`schedule\`:

- \`0 9 * * 1\`

Schedules use five-field UTC cron syntax.

## Integrations and setup

This wobblie requires these integrations to work as intended:

- \`github\`

This wobblie declares these optional integrations:

- \`linear\`

Set up or configure integrations here:

https://dash.wobblies.ai/organizations/acme/integrations

## Review and iterate before merging

Before merging, review the installed \`WOBBLIE.md\` and confirm that:

- the \`purpose\` matches the recurring work you want Wobblie to own
- the \`watch\` conditions and/or \`schedule\` are narrow enough for initial rollout
- the \`routines\` are concrete and bounded
- the \`deny\` rules cover actions Wobblie should not take
- any required integrations above are connected for this organization

You can ask Wobblie on this PR to adjust the wobblie before merging. Just leave a comment mentioning \`@WobblieHelps\`.

For rollout and iteration guidance:

https://docs.wobblies.ai/wobblies/testing-and-iterating-on-wobblies

## Activity and future tuning

After this wobblie is merged and ingested, you can review wobblie activity here:

https://dash.wobblies.ai/organizations/acme/activity?wobblieId=templated-wobblie

To browse more wobblie examples:

https://github.com/wobblie-hq/wobblies-library/blob/master/README.md

${result.markerText}`);
    expect(pullBody).toContain('secret-target');
    expect(pullBody).toContain('secret-option');
    expect(result.markerText).toContain('wobblie-wobblie-install-v1');
    expect(result.markerText).toContain('required_value');
    expect(result.markerText).not.toContain('secret-target');
    expect(result.markerText).not.toContain('secret-option');
    expect(pullBody.endsWith(result.markerText)).toBe(true);
    expect(parseWobblieInstallMarker(pullBody)).toMatchObject({ ok: true });
  });

  test('omits none-listed integration placeholder when required integrations exist and optional integrations are empty', async () => {
    const githubClient = successGithubClient();

    await createWobblieInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobblie',
      base: 'main',
      sourceRef: 'test-ref',
      adaptations: { required_value: 'secret-target' },
      catalogClient: catalogClientWithIntegrations({ requiredIntegrations: ['github'], optionalIntegrations: [] }),
      githubClient,
    });

    const section = integrationsSection(createdPullRequestBody(githubClient.calls));
    expect(section).toContain('This wobblie requires these integrations to work as intended:');
    expect(section).toContain('- `github`');
    expect(section).not.toContain('This wobblie declares these optional integrations:');
    expect(section).not.toContain('- None listed');
  });

  test('lists none when required and optional integrations are both empty', async () => {
    const githubClient = successGithubClient();

    await createWobblieInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobblie',
      base: 'main',
      sourceRef: 'test-ref',
      adaptations: { required_value: 'secret-target' },
      catalogClient: catalogClientWithIntegrations({ requiredIntegrations: [], optionalIntegrations: [] }),
      githubClient,
    });

    const section = integrationsSection(createdPullRequestBody(githubClient.calls));
    expect(section).toBe(`## Integrations and setup\n\n- None listed\n\nSet up or configure integrations here:\n\nhttps://dash.wobblies.ai/organizations/acme/integrations\n\n`);
  });

  test('renders optional-only integrations without the none-listed placeholder', async () => {
    const githubClient = successGithubClient();

    await createWobblieInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobblie',
      base: 'main',
      sourceRef: 'test-ref',
      adaptations: { required_value: 'secret-target' },
      catalogClient: catalogClientWithIntegrations({ requiredIntegrations: [], optionalIntegrations: ['linear'] }),
      githubClient,
    });

    const section = integrationsSection(createdPullRequestBody(githubClient.calls));
    expect(section).not.toContain('This wobblie requires these integrations to work as intended:');
    expect(section).toContain('This wobblie declares these optional integrations:');
    expect(section).toContain('- `linear`');
    expect(section).not.toContain('- None listed');
  });

  test('idempotently returns an exact-head open PR for an existing install branch', async () => {
    const calls: RecordedCall[] = [];
    const githubClient: WobblieInstallPrGitHubClient = {
      async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
        calls.push({ method, path: requestPath, options });
        if (method === 'GET' && requestPath.endsWith('/git/ref/heads/wobblie/wobblie-installs/templated-wobblie')) {
          return { ref: 'refs/heads/wobblie/wobblie-installs/templated-wobblie', object: { sha: 'existing-sha', type: 'commit' } } as T;
        }
        if (method === 'GET' && requestPath.endsWith('/pulls')) {
          return [makePull({ number: 7, branch: 'wobblie/wobblie-installs/templated-wobblie', sha: 'existing-sha' })] as T;
        }
        throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
      },
    };

    const result = await createWobblieInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobblie',
      base: 'main',
      sourceRef: 'test-ref',
      adaptations: { required_value: 'secret-target' },
      catalogClient,
      githubClient,
    });

    expect(result.status).toBe('existing_open');
    expect(result.pullRequest.number).toBe(7);
    expect(calls.some((call) => call.method === 'POST' && call.path.endsWith('/git/trees'))).toBe(false);
    expect(calls.some((call) => call.method === 'POST' && call.path.endsWith('/git/refs'))).toBe(false);
  });

  test('recovers an existing deterministic branch without a pull request when files match', async () => {
    const renderedWobblie = templatedWobblie.replaceAll('{{adapt.required_value}}', 'secret-target').replaceAll('{{adapt.optional_value}}', 'from-default');
    const renderedScript = '#!/usr/bin/env bash\necho secret-target from-default\n';
    const renderedReference = '# Rendered\n\nTarget: secret-target\nOptional: from-default\n';
    const calls: RecordedCall[] = [];
    const githubClient: WobblieInstallPrGitHubClient = {
      async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
        calls.push({ method, path: requestPath, options });
        if (method === 'GET' && requestPath.endsWith('/git/ref/heads/wobblie/wobblie-installs/templated-wobblie')) {
          return { ref: 'refs/heads/wobblie/wobblie-installs/templated-wobblie', object: { sha: 'existing-sha', type: 'commit' } } as T;
        }
        if (method === 'GET' && requestPath.endsWith('/pulls')) {
          return [] as T;
        }
        if (method === 'GET' && requestPath.endsWith('/git/commits/existing-sha')) {
          return { sha: 'existing-sha', tree: { sha: 'existing-tree' } } as T;
        }
        if (method === 'GET' && requestPath.endsWith('/git/trees/existing-tree')) {
          return {
            sha: 'existing-tree',
            tree: [
              { path: '.agents/wobblies/templated-wobblie/WOBBLIE.md', type: 'blob', mode: '100644', sha: gitBlobSha(renderedWobblie) },
              { path: '.agents/wobblies/templated-wobblie/scripts/render.sh', type: 'blob', mode: '100755', sha: gitBlobSha(renderedScript) },
              { path: '.agents/wobblies/templated-wobblie/references/render.md', type: 'blob', mode: '100644', sha: gitBlobSha(renderedReference) },
            ],
          } as T;
        }
        if (method === 'POST' && requestPath.endsWith('/pulls')) {
          const body = (options as { body: { body: string } }).body.body;
          return makePull({ number: 8, branch: 'wobblie/wobblie-installs/templated-wobblie', sha: 'existing-sha', body }) as T;
        }
        throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
      },
    };

    const result = await createWobblieInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobblie',
      base: 'main',
      sourceRef: 'test-ref',
      adaptations: { required_value: 'secret-target' },
      catalogClient,
      githubClient,
    });

    expect(result.status).toBe('recovered_branch');
    expect(result.pullRequest.number).toBe(8);
    expect(calls.some((call) => call.method === 'POST' && call.path.endsWith('/git/refs'))).toBe(false);
  });

  test('refuses target path collisions on the target base before creating a branch', async () => {
    const calls: RecordedCall[] = [];
    const githubClient: WobblieInstallPrGitHubClient = {
      async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
        calls.push({ method, path: requestPath, options });
        if (method === 'GET' && requestPath.endsWith('/git/ref/heads/wobblie/wobblie-installs/templated-wobblie')) {
          throw githubError(404, 'branch missing');
        }
        if (method === 'GET' && requestPath.endsWith('/git/ref/heads/main')) {
          return { ref: 'refs/heads/main', object: { sha: 'base-sha', type: 'commit' } } as T;
        }
        if (method === 'GET' && requestPath.endsWith('/git/commits/base-sha')) {
          return { sha: 'base-sha', tree: { sha: 'base-tree' } } as T;
        }
        if (method === 'GET' && requestPath.endsWith('/git/trees/base-tree')) {
          return {
            sha: 'base-tree',
            tree: [{ path: '.agents/wobblies/templated-wobblie/WOBBLIE.md', type: 'blob', mode: '100644', sha: 'old' }],
          } as T;
        }
        throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
      },
    };

    await expect(
      createWobblieInstallPullRequest({
        repo: 'acme/widgets',
        exampleId: 'templated-wobblie',
        base: 'main',
        sourceRef: 'test-ref',
        adaptations: { required_value: 'secret-target' },
        catalogClient,
        githubClient,
      })
    ).rejects.toMatchObject({ code: 'INSTALL_COLLISION' });
    expect(calls.some((call) => call.method === 'POST' && call.path.endsWith('/git/trees'))).toBe(false);
  });

  test('lists marker-backed PRs and reconciles edited-body install branches', async () => {
    const branch = 'wobblie/wobblie-installs/templated-wobblie';
    const marker = createWobblieInstallMarker({
      version: 1,
      exampleId: 'templated-wobblie',
      sourceRepo: 'wobblie-hq/wobblies-library',
      sourceRef: 'test-ref',
      catalogPath: 'examples.json',
      catalogSchemaVersion: 1,
      targetDirectory: '.agents/wobblies/templated-wobblie',
      files: ['.agents/wobblies/templated-wobblie/WOBBLIE.md'],
      adaptationKeys: ['required_value'],
      branch,
    });
    const githubClient: WobblieInstallPrGitHubClient = {
      async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
        if (method === 'GET' && requestPath === '/search/issues') {
          return { items: [{ number: 1, pull_request: {} }, { number: 2, pull_request: {} }] } as T;
        }
        if (method === 'GET' && requestPath.endsWith('/pulls/1')) {
          return makePull({ number: 1, branch, sha: 'open-sha', body: marker }) as T;
        }
        if (method === 'GET' && requestPath.endsWith('/pulls/2')) {
          return makePull({ number: 2, branch: 'wobblie/wobblie-installs/merged-wobblie', sha: 'merged-sha', state: 'closed', mergedAt: '2026-01-01T00:00:00Z', body: marker }) as T;
        }
        if (method === 'GET' && requestPath.includes('/git/matching-refs/heads/wobblie/wobblie-installs/')) {
          return [
            { ref: 'refs/heads/wobblie/wobblie-installs/edited-body', object: { sha: 'edited-sha', type: 'commit' } },
            { ref: 'refs/heads/wobblie/wobblie-installs/orphan', object: { sha: 'orphan-sha', type: 'commit' } },
          ] as T;
        }
        if (method === 'GET' && requestPath.endsWith('/pulls')) {
          const query = (options as { query: { head: string } }).query;
          if (query.head.endsWith(':wobblie/wobblie-installs/edited-body')) {
            return [makePull({ number: 3, branch: 'wobblie/wobblie-installs/edited-body', sha: 'edited-sha', state: 'closed', body: null })] as T;
          }
          if (query.head.endsWith(':wobblie/wobblie-installs/orphan')) {
            return [] as T;
          }
        }
        throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
      },
    };

    const result = await listWobblieInstallPullRequests({ repo: 'acme/widgets', githubClient });

    expect(result.installPullRequests.map((item) => item.status)).toEqual([
      'open',
      'merged',
      'closed_unmerged',
      'branchWithoutPullRequest',
    ]);
    expect(result.installPullRequests[0]?.markerValid).toBe(true);
    expect(result.installPullRequests[2]?.warnings).toContainEqual(expect.objectContaining({ code: 'INSTALL_MARKER_MISSING' }));
    expect(result.installPullRequests[3]).toMatchObject({
      wobblieId: 'orphan',
      headSha: 'orphan-sha',
      pullRequest: null,
    });
  });

  test('CLI pr open uses env-style wrapper shape and keeps raw adaptation values out of JSON output', async () => {
    const githubClient = successGithubClient();
    let stdout = '';
    let stderr = '';
    const code = await executeCli({
      argv: [
        'pr',
        'open',
        'templated-wobblie',
        '--repo',
        'acme/widgets',
        '--base',
        'main',
        '--ref',
        'test-ref',
        '--adapt',
        'required_value=secret-target',
        '--json',
      ],
      catalogClient,
      githubClient,
      output: {
        cwd: process.cwd(),
        stdout: (text) => {
          stdout += text;
        },
        stderr: (text) => {
          stderr += text;
        },
      },
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).not.toContain('secret-target');
    const parsed = JSON.parse(stdout);
    expect(parsed).toMatchObject({
      command: 'pr open',
      ok: true,
      data: {
        repository: 'acme/widgets',
        baseBranch: 'main',
        headBranch: 'wobblie/wobblie-installs/templated-wobblie',
        adaptationsApplied: ['optional_value', 'required_value'],
      },
    });
  });

  test('marker parser reports invalid marker bodies without throwing', () => {
    expect(parseWobblieInstallMarker('no marker')).toEqual({ ok: false, present: false, error: null });
    expect(parseWobblieInstallMarker('<!-- wobblie-wobblie-install-v1 {bad json} -->')).toMatchObject({
      ok: false,
      present: true,
      error: { code: 'INSTALL_MARKER_INVALID_JSON' },
    });
  });

  test('public error exposes structured issue data', async () => {
    await expect(
      createWobblieInstallPullRequest({
        repo: 'acme/widgets',
        exampleId: 'templated-wobblie',
        base: 'main',
        sourceRef: 'test-ref',
        catalogClient,
        githubClient: successGithubClient(),
      })
    ).rejects.toBeInstanceOf(WobblieInstallPullRequestError);
  });
});
