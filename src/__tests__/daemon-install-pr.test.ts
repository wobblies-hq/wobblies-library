import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { executeCli } from '../wobbly-cli/cli';
import type { CatalogClient } from '../wobbly-cli/types';
import {
  WOBBLY_INSTALL_BRANCH_PREFIX,
  WobblyInstallPullRequestError,
  createWobblyInstallMarker,
  createWobblyInstallPullRequest,
  listWobblyInstallPullRequests,
  parseWobblyInstallMarker,
  type WobblyInstallPrGitHubClient,
} from '../wobbly-install-pr';
import type { ExamplesCatalog } from '../examples/types';

const templatedWobbly = `---
id: templated-wobbly
purpose: Keep {{adapt.required_value}} healthy.
watch:
  - when {{adapt.required_value}} changes
routines:
  - run {{adapt.optional_value}} checks
deny:
  - do not expose raw adaptation values in CLI output
schedule: "0 9 * * 1"
---

# Templated wobbly

Target: {{adapt.required_value}}
Optional: {{adapt.optional_value}}
`;

const catalog: ExamplesCatalog = {
  schemaVersion: 2,
  source: {
    repository: 'universe-backwards/wobblies-library',
    baseDirectory: 'wobblys',
  },
  examples: [
    {
      id: 'templated-wobbly',
      title: 'Templated wobbly',
      status: 'ready',
      summary: 'A wobbly fixture with structured adaptations.',
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
          description: 'Required string rendered into the wobbly and support files.',
          required: true,
        },
        {
          key: 'optional_value',
          label: 'Optional value',
          description: 'Optional string rendered into the wobbly and support files.',
          required: false,
          default: 'from-default',
        },
      ],
      specializationIdeas: [],
      wobbly: {
        path: 'WOBBLY.md',
        content: templatedWobbly,
      },
      scripts: ['scripts/render.sh'],
      references: ['references/render.md'],
      source: {
        directory: 'wobblys/templated-wobbly',
        url: 'https://github.com/universe-backwards/wobblies-library/tree/master/wobblys/templated-wobbly',
      },
    },
  ],
};

const catalogClient: CatalogClient = {
  async loadCatalog(): Promise<ExamplesCatalog> {
    return catalog;
  },
  async readTextFile(_ref: string, path: string): Promise<string> {
    if (path === 'wobblys/templated-wobbly/scripts/render.sh') {
      return '#!/usr/bin/env bash\necho {{adapt.required_value}} {{adapt.optional_value}}\n';
    }
    if (path === 'wobblys/templated-wobbly/references/render.md') {
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

function successGithubClient(): WobblyInstallPrGitHubClient & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const client: WobblyInstallPrGitHubClient & { calls: RecordedCall[] } = {
    calls,
    async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
      calls.push({ method, path: requestPath, options });
      if (method === 'GET' && requestPath.endsWith('/git/ref/heads/wobbly/wobbly-installs/templated-wobbly')) {
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
        return { ref: 'refs/heads/wobbly/wobbly-installs/templated-wobbly', object: { sha: 'created-commit', type: 'commit' } } as T;
      }
      if (method === 'POST' && requestPath.endsWith('/pulls')) {
        const body = (options as { body: { body: string } }).body.body;
        return makePull({
          number: 42,
          branch: 'wobbly/wobbly-installs/templated-wobbly',
          sha: 'created-commit',
          body,
          title: 'Install templated-wobbly wobbly',
        }) as T;
      }
      throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
    },
  };
  return client;
}

describe('wobbly install PR API', () => {
  test('creates a deterministic branch, atomic commit, educational PR body, and hidden marker without raw adaptation values', async () => {
    const githubClient = successGithubClient();

    const result = await createWobblyInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobbly',
      base: 'main',
      sourceRef: 'test-ref',
      adaptations: { required_value: 'secret-target', optional_value: 'secret-option' },
      catalogClient,
      githubClient,
    });

    expect(result.status).toBe('created');
    expect(result.repository).toBe('acme/widgets');
    expect(result.baseBranch).toBe('main');
    expect(result.headBranch).toBe(`${WOBBLY_INSTALL_BRANCH_PREFIX}templated-wobbly`);
    expect(result.headSha).toBe('created-commit');
    expect(result.filesPlanned.map((file) => file.destinationPath)).toEqual([
      '.agents/wobblys/templated-wobbly/WOBBLY.md',
      '.agents/wobblys/templated-wobbly/scripts/render.sh',
      '.agents/wobblys/templated-wobbly/references/render.md',
    ]);
    expect(result.adaptationsApplied).toEqual(['optional_value', 'required_value']);
    expect(result.markerText).toContain('wobbly-wobbly-install-v1');
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
          expect.objectContaining({ path: '.agents/wobblys/templated-wobbly/WOBBLY.md', mode: '100644', type: 'blob' }),
          expect.objectContaining({ path: '.agents/wobblys/templated-wobbly/scripts/render.sh', mode: '100755', type: 'blob' }),
        ]),
      },
    });

    const pullCall = githubClient.calls.find((call) => call.method === 'POST' && call.path.endsWith('/pulls'));
    const pullBody = (pullCall?.options as { body: { body: string } }).body.body;
    expect(pullBody).toBe(`## Summary

This PR installs the \`templated-wobbly\` Wobbly wobbly to \`.agents/wobblys/templated-wobbly/WOBBLY.md\`. It was generated by Wobbly from the [\`templated-wobbly\` example](https://github.com/universe-backwards/wobblies-library/blob/master/wobblys/templated-wobbly/WOBBLY.md).

The wobbly won't start working until it's merged to the repo's default branch.

## What Wobbly wobblys are

Wobbly is an async engineering teammate that works in the tools your team already uses. In GitHub, Wobbly can inspect code, review changes, propose patches, open PRs, and comment with findings. With connected integrations, Wobbly can also use Linear, Slack, and Sentry context to understand issues, conversations, alerts, and follow-up work.

A wobbly is a recurring role for Wobbly. Instead of waiting for someone to mention Wobbly every time the same kind of maintenance work appears, the repo contains a small role definition that tells Wobbly when to wake up and what job to do.

This PR adds that role at \`.agents/wobblys/templated-wobbly/WOBBLY.md\`. The file controls:

- when Wobbly can activate, through \`watch\` conditions or a \`schedule\`
- what work Wobbly should perform, through \`purpose\` and \`routines\`
- what Wobbly should avoid, through \`deny\` rules and body guidance

After this PR is merged and Wobbly ingests the default-branch version, the wobbly can start handling that recurring work inside the limits defined in \`WOBBLY.md\`.

Learn more: https://docs.wobblies.ai/wobblys

## What this wobbly does

\`WOBBLY.md\` purpose:

> Keep secret-target healthy.

This wobbly’s configured routines are:

- run secret-option checks

## When this wobbly can activate

This PR only installs wobbly files. The wobbly becomes eligible for live activations after both are true:

1. this PR is merged to the repo's default branch
2. Wobbly ingests the merged default-branch version of \`WOBBLY.md\`

### Watch conditions

Wobbly may wake this wobbly when these \`watch\` conditions match:

- when secret-target changes

### Schedule

Wobbly may also wake this wobbly on this \`schedule\`:

- \`0 9 * * 1\`

Schedules use five-field UTC cron syntax.

## Integrations and setup

This wobbly requires these integrations to work as intended:

- \`github\`

This wobbly declares these optional integrations:

- \`linear\`

Set up or configure integrations here:

https://dash.wobblies.ai/organizations/acme/integrations

## Review and iterate before merging

Before merging, review the installed \`WOBBLY.md\` and confirm that:

- the \`purpose\` matches the recurring work you want Wobbly to own
- the \`watch\` conditions and/or \`schedule\` are narrow enough for initial rollout
- the \`routines\` are concrete and bounded
- the \`deny\` rules cover actions Wobbly should not take
- any required integrations above are connected for this organization

You can ask Wobbly on this PR to adjust the wobbly before merging. Just leave a comment mentioning \`@WobblyHelps\`.

For rollout and iteration guidance:

https://docs.wobblies.ai/wobblys/testing-and-iterating-on-wobblys

## Activity and future tuning

After this wobbly is merged and ingested, you can review wobbly activity here:

https://dash.wobblies.ai/organizations/acme/activity?wobblyId=templated-wobbly

To browse more wobbly examples:

https://github.com/universe-backwards/wobblies-library/blob/master/README.md

${result.markerText}`);
    expect(pullBody).toContain('secret-target');
    expect(pullBody).toContain('secret-option');
    expect(result.markerText).toContain('wobbly-wobbly-install-v1');
    expect(result.markerText).toContain('required_value');
    expect(result.markerText).not.toContain('secret-target');
    expect(result.markerText).not.toContain('secret-option');
    expect(pullBody.endsWith(result.markerText)).toBe(true);
    expect(parseWobblyInstallMarker(pullBody)).toMatchObject({ ok: true });
  });

  test('omits none-listed integration placeholder when required integrations exist and optional integrations are empty', async () => {
    const githubClient = successGithubClient();

    await createWobblyInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobbly',
      base: 'main',
      sourceRef: 'test-ref',
      adaptations: { required_value: 'secret-target' },
      catalogClient: catalogClientWithIntegrations({ requiredIntegrations: ['github'], optionalIntegrations: [] }),
      githubClient,
    });

    const section = integrationsSection(createdPullRequestBody(githubClient.calls));
    expect(section).toContain('This wobbly requires these integrations to work as intended:');
    expect(section).toContain('- `github`');
    expect(section).not.toContain('This wobbly declares these optional integrations:');
    expect(section).not.toContain('- None listed');
  });

  test('lists none when required and optional integrations are both empty', async () => {
    const githubClient = successGithubClient();

    await createWobblyInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobbly',
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

    await createWobblyInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobbly',
      base: 'main',
      sourceRef: 'test-ref',
      adaptations: { required_value: 'secret-target' },
      catalogClient: catalogClientWithIntegrations({ requiredIntegrations: [], optionalIntegrations: ['linear'] }),
      githubClient,
    });

    const section = integrationsSection(createdPullRequestBody(githubClient.calls));
    expect(section).not.toContain('This wobbly requires these integrations to work as intended:');
    expect(section).toContain('This wobbly declares these optional integrations:');
    expect(section).toContain('- `linear`');
    expect(section).not.toContain('- None listed');
  });

  test('idempotently returns an exact-head open PR for an existing install branch', async () => {
    const calls: RecordedCall[] = [];
    const githubClient: WobblyInstallPrGitHubClient = {
      async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
        calls.push({ method, path: requestPath, options });
        if (method === 'GET' && requestPath.endsWith('/git/ref/heads/wobbly/wobbly-installs/templated-wobbly')) {
          return { ref: 'refs/heads/wobbly/wobbly-installs/templated-wobbly', object: { sha: 'existing-sha', type: 'commit' } } as T;
        }
        if (method === 'GET' && requestPath.endsWith('/pulls')) {
          return [makePull({ number: 7, branch: 'wobbly/wobbly-installs/templated-wobbly', sha: 'existing-sha' })] as T;
        }
        throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
      },
    };

    const result = await createWobblyInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobbly',
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
    const renderedWobbly = templatedWobbly.replaceAll('{{adapt.required_value}}', 'secret-target').replaceAll('{{adapt.optional_value}}', 'from-default');
    const renderedScript = '#!/usr/bin/env bash\necho secret-target from-default\n';
    const renderedReference = '# Rendered\n\nTarget: secret-target\nOptional: from-default\n';
    const calls: RecordedCall[] = [];
    const githubClient: WobblyInstallPrGitHubClient = {
      async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
        calls.push({ method, path: requestPath, options });
        if (method === 'GET' && requestPath.endsWith('/git/ref/heads/wobbly/wobbly-installs/templated-wobbly')) {
          return { ref: 'refs/heads/wobbly/wobbly-installs/templated-wobbly', object: { sha: 'existing-sha', type: 'commit' } } as T;
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
              { path: '.agents/wobblys/templated-wobbly/WOBBLY.md', type: 'blob', mode: '100644', sha: gitBlobSha(renderedWobbly) },
              { path: '.agents/wobblys/templated-wobbly/scripts/render.sh', type: 'blob', mode: '100755', sha: gitBlobSha(renderedScript) },
              { path: '.agents/wobblys/templated-wobbly/references/render.md', type: 'blob', mode: '100644', sha: gitBlobSha(renderedReference) },
            ],
          } as T;
        }
        if (method === 'POST' && requestPath.endsWith('/pulls')) {
          const body = (options as { body: { body: string } }).body.body;
          return makePull({ number: 8, branch: 'wobbly/wobbly-installs/templated-wobbly', sha: 'existing-sha', body }) as T;
        }
        throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
      },
    };

    const result = await createWobblyInstallPullRequest({
      repo: 'acme/widgets',
      exampleId: 'templated-wobbly',
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
    const githubClient: WobblyInstallPrGitHubClient = {
      async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
        calls.push({ method, path: requestPath, options });
        if (method === 'GET' && requestPath.endsWith('/git/ref/heads/wobbly/wobbly-installs/templated-wobbly')) {
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
            tree: [{ path: '.agents/wobblys/templated-wobbly/WOBBLY.md', type: 'blob', mode: '100644', sha: 'old' }],
          } as T;
        }
        throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
      },
    };

    await expect(
      createWobblyInstallPullRequest({
        repo: 'acme/widgets',
        exampleId: 'templated-wobbly',
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
    const branch = 'wobbly/wobbly-installs/templated-wobbly';
    const marker = createWobblyInstallMarker({
      version: 1,
      exampleId: 'templated-wobbly',
      sourceRepo: 'universe-backwards/wobblies-library',
      sourceRef: 'test-ref',
      catalogPath: 'examples.json',
      catalogSchemaVersion: 1,
      targetDirectory: '.agents/wobblys/templated-wobbly',
      files: ['.agents/wobblys/templated-wobbly/WOBBLY.md'],
      adaptationKeys: ['required_value'],
      branch,
    });
    const githubClient: WobblyInstallPrGitHubClient = {
      async request<T>(method: string, requestPath: string, options?: unknown): Promise<T> {
        if (method === 'GET' && requestPath === '/search/issues') {
          return { items: [{ number: 1, pull_request: {} }, { number: 2, pull_request: {} }] } as T;
        }
        if (method === 'GET' && requestPath.endsWith('/pulls/1')) {
          return makePull({ number: 1, branch, sha: 'open-sha', body: marker }) as T;
        }
        if (method === 'GET' && requestPath.endsWith('/pulls/2')) {
          return makePull({ number: 2, branch: 'wobbly/wobbly-installs/merged-wobbly', sha: 'merged-sha', state: 'closed', mergedAt: '2026-01-01T00:00:00Z', body: marker }) as T;
        }
        if (method === 'GET' && requestPath.includes('/git/matching-refs/heads/wobbly/wobbly-installs/')) {
          return [
            { ref: 'refs/heads/wobbly/wobbly-installs/edited-body', object: { sha: 'edited-sha', type: 'commit' } },
            { ref: 'refs/heads/wobbly/wobbly-installs/orphan', object: { sha: 'orphan-sha', type: 'commit' } },
          ] as T;
        }
        if (method === 'GET' && requestPath.endsWith('/pulls')) {
          const query = (options as { query: { head: string } }).query;
          if (query.head.endsWith(':wobbly/wobbly-installs/edited-body')) {
            return [makePull({ number: 3, branch: 'wobbly/wobbly-installs/edited-body', sha: 'edited-sha', state: 'closed', body: null })] as T;
          }
          if (query.head.endsWith(':wobbly/wobbly-installs/orphan')) {
            return [] as T;
          }
        }
        throw new Error(`unexpected GitHub request ${method} ${requestPath}`);
      },
    };

    const result = await listWobblyInstallPullRequests({ repo: 'acme/widgets', githubClient });

    expect(result.installPullRequests.map((item) => item.status)).toEqual([
      'open',
      'merged',
      'closed_unmerged',
      'branchWithoutPullRequest',
    ]);
    expect(result.installPullRequests[0]?.markerValid).toBe(true);
    expect(result.installPullRequests[2]?.warnings).toContainEqual(expect.objectContaining({ code: 'INSTALL_MARKER_MISSING' }));
    expect(result.installPullRequests[3]).toMatchObject({
      wobblyId: 'orphan',
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
        'templated-wobbly',
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
        headBranch: 'wobbly/wobbly-installs/templated-wobbly',
        adaptationsApplied: ['optional_value', 'required_value'],
      },
    });
  });

  test('marker parser reports invalid marker bodies without throwing', () => {
    expect(parseWobblyInstallMarker('no marker')).toEqual({ ok: false, present: false, error: null });
    expect(parseWobblyInstallMarker('<!-- wobbly-wobbly-install-v1 {bad json} -->')).toMatchObject({
      ok: false,
      present: true,
      error: { code: 'INSTALL_MARKER_INVALID_JSON' },
    });
  });

  test('public error exposes structured issue data', async () => {
    await expect(
      createWobblyInstallPullRequest({
        repo: 'acme/widgets',
        exampleId: 'templated-wobbly',
        base: 'main',
        sourceRef: 'test-ref',
        catalogClient,
        githubClient: successGithubClient(),
      })
    ).rejects.toBeInstanceOf(WobblyInstallPullRequestError);
  });
});
