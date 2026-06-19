import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { parseExamplesCatalogValue } from '../../examples/schema';
import type { ExamplesCatalog } from '../../examples/types';
import { executeCli } from '../cli';
import { createWobblyInstallPlan } from '../install-plan';
import type { CatalogClient } from '../types';
import { validateCronExpression } from '../validation/cron';

const readyWobbly = `---
id: ready-wobbly
purpose: Keep the fixture ready.
watch:
  - when a pull request changes files under src/
routines:
  - inspect the change and report bounded findings
deny:
  - do not merge pull requests
schedule: "0 9 * * 1-5"
---

# Ready wobbly

Use this fixture for CLI tests.
`;

const deprecatedWobbly = `---
id: deprecated-wobbly
purpose: Keep the deprecated fixture valid.
watch:
  - when a deprecated test event occurs
routines:
  - no-op safely
deny:
  - do not mutate production resources
---

# Deprecated wobbly

Deprecated fixture content.
`;


const templatedWobbly = `---
id: templated-wobbly
purpose: Keep {{ adapt.required_value }} healthy.
watch:
  - when {{adapt.required_value}} changes
routines:
  - run {{adapt.optional_value}} checks
deny:
  - do not expose raw adaptation values in CLI output
---

# Templated wobbly

Target: {{adapt.required_value}}
Optional: {{ adapt.optional_value }}
`;

const catalog: ExamplesCatalog = {
  schemaVersion: 2,
  source: {
    repository: 'universe-backwards/wobblies-library',
    baseDirectory: 'wobblys',
  },
  examples: [
    {
      id: 'ready-wobbly',
      title: 'Ready wobbly',
      status: 'ready',
      summary: 'A ready wobbly fixture.',
      readiness: 'direct-copy',
      showOnWebsite: true,
      showInDashboard: true,
      fit: {
        jobsToBeDone: ['operate'],
        bestFor: ['tests'],
        notFor: ['production without edits'],
      },
      requirements: {
        requiredIntegrations: ['github'],
        optionalIntegrations: ['linear'],
        other: ['repo-specific commands'],
      },
      adaptations: [],
      specializationIdeas: ['Tighten fixture command scope for production tests.'],
      wobbly: {
        path: 'WOBBLY.md',
        content: readyWobbly,
      },
      scripts: ['scripts/run.sh'],
      references: ['references/guide.md'],
      source: {
        directory: 'wobblys/ready-wobbly',
        url: 'https://github.com/universe-backwards/wobblies-library/tree/master/wobblys/ready-wobbly',
      },
    },
    {
      id: 'deprecated-wobbly',
      title: 'Deprecated wobbly',
      status: 'deprecated',
      summary: 'A deprecated wobbly fixture.',
      readiness: 'direct-copy',
      showOnWebsite: false,
      showInDashboard: false,
      fit: {
        jobsToBeDone: ['operate'],
        bestFor: ['legacy tests'],
        notFor: ['new installs'],
      },
      requirements: {
        requiredIntegrations: ['github'],
        optionalIntegrations: [],
        other: [],
      },
      adaptations: [],
      specializationIdeas: [],
      wobbly: {
        path: 'WOBBLY.md',
        content: deprecatedWobbly,
      },
      scripts: [],
      references: [],
      source: {
        directory: 'wobblys/deprecated-wobbly',
        url: 'https://github.com/universe-backwards/wobblies-library/tree/master/wobblys/deprecated-wobbly',
      },
    },
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
        optionalIntegrations: [],
        other: [],
      },
      adaptations: [
        {
          key: 'required_value',
          label: 'Required value',
          description: 'Required string rendered into the wobbly and support files.',
          required: true,
          suggestions: ['from-cli', 'from-file'],
        },
        {
          key: 'optional_value',
          label: 'Optional value',
          description: 'Optional string rendered into the wobbly and support files.',
          required: false,
          default: 'from-default',
          suggestions: ['from-default', 'from-file', 'from-cli'],
        },
      ],
      specializationIdeas: ['Render optional values into extra support files when needed.'],
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

function memoryCatalogClient(
  overrides: Partial<Record<string, string>> = {},
  catalogValue: ExamplesCatalog = catalog
): CatalogClient {
  const files = new Map<string, string>([
    ['test-ref:wobblys/ready-wobbly/scripts/run.sh', '#!/usr/bin/env bash\necho ready\n'],
    ['test-ref:wobblys/ready-wobbly/references/guide.md', '# Guide\n\nAdapt me.\n'],
    ['master:wobblys/ready-wobbly/scripts/run.sh', '#!/usr/bin/env bash\necho ready\n'],
    ['master:wobblys/ready-wobbly/references/guide.md', '# Guide\n\nAdapt me.\n'],
    ['test-ref:wobblys/templated-wobbly/scripts/render.sh', '#!/usr/bin/env bash\necho {{adapt.required_value}} {{adapt.optional_value}}\n'],
    ['test-ref:wobblys/templated-wobbly/references/render.md', '# Rendered\n\nTarget: {{ adapt.required_value }}\nOptional: {{adapt.optional_value}}\n'],
    ['master:wobblys/templated-wobbly/scripts/render.sh', '#!/usr/bin/env bash\necho {{adapt.required_value}} {{adapt.optional_value}}\n'],
    ['master:wobblys/templated-wobbly/references/render.md', '# Rendered\n\nTarget: {{ adapt.required_value }}\nOptional: {{adapt.optional_value}}\n'],
  ]);
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      files.set(key, value);
    }
  }

  return {
    async loadCatalog(): Promise<ExamplesCatalog> {
      return catalogValue;
    },
    async readTextFile(ref: string, filePath: string): Promise<string> {
      const key = `${ref}:${filePath}`;
      const value = files.get(key);
      if (value === undefined) {
        throw new Error(`missing mock file ${key}`);
      }
      return value;
    },
  };
}

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), 'wobbly-cli-test-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function runJson(argv: string[], cwd: string, client: CatalogClient = memoryCatalogClient()): Promise<{ code: number; stdout: string; stderr: string; json: any }> {
  let stdout = '';
  let stderr = '';
  const code = await executeCli({
    argv: [...argv, '--json'],
    catalogClient: client,
    output: {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: (text) => {
        stderr += text;
      },
    },
  });
  return { code, stdout, stderr, json: JSON.parse(stdout) };
}

describe('wobbly CLI catalog commands', () => {
  test('list returns stable JSON envelope with pinned ref', async () => {
    await withTempDir(async (directory) => {
      const result = await runJson(['list', '--ref', 'test-ref'], directory);

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.json).toMatchObject({
        command: 'list',
        ok: true,
        exitCode: 0,
        data: {
          sourceRef: 'test-ref',
          exampleIds: ['ready-wobbly', 'deprecated-wobbly', 'templated-wobbly'],
        },
      });
    });
  });

  test('show exposes support files, integrations, and specialization ideas', async () => {
    await withTempDir(async (directory) => {
      const result = await runJson(['show', 'ready-wobbly', '--ref', 'test-ref'], directory);

      expect(result.code).toBe(0);
      expect(result.json.data).toMatchObject({
        id: 'ready-wobbly',
        status: 'ready',
        readiness: 'direct-copy',
        requiredIntegrations: ['github'],
        optionalIntegrations: ['linear'],
        scripts: ['scripts/run.sh'],
        references: ['references/guide.md'],
        specializationIdeas: ['Tighten fixture command scope for production tests.'],
      });
      expect(result.json.data.activationRequired).toContain('not active until');
    });
  });

  test('show exposes structured adaptation metadata', async () => {
    await withTempDir(async (directory) => {
      const result = await runJson(['show', 'templated-wobbly', '--ref', 'test-ref'], directory);

      expect(result.code).toBe(0);
      expect(result.json.data.specializationIdeas).toEqual(['Render optional values into extra support files when needed.']);
      expect(result.json.data.adaptations).toEqual([
        {
          key: 'required_value',
          label: 'Required value',
          description: 'Required string rendered into the wobbly and support files.',
          required: true,
          suggestions: ['from-cli', 'from-file'],
        },
        {
          key: 'optional_value',
          label: 'Optional value',
          description: 'Optional string rendered into the wobbly and support files.',
          required: false,
          default: 'from-default',
          suggestions: ['from-default', 'from-file', 'from-cli'],
        },
      ]);
    });
  });

  test('add renders adaptations into wobbly and support files with deterministic precedence', async () => {
    await withTempDir(async (directory) => {
      const adaptFile = path.join(directory, 'adaptations.json');
      await writeFile(
        adaptFile,
        JSON.stringify({ required_value: 'from-file', optional_value: 'from-file' }),
        'utf8'
      );

      const result = await runJson([
        'add',
        'templated-wobbly',
        '--ref',
        'test-ref',
        '--adapt-file',
        adaptFile,
        '--adapt',
        'optional_value=from-cli',
        '--adapt',
        'required_value=from-cli',
      ], directory);

      expect(result.code).toBe(0);
      expect(result.json.data.adaptationsApplied).toEqual(['optional_value', 'required_value']);
      expect(result.stdout).not.toContain('from-cli');
      expect(result.stdout).not.toContain('from-file');
      expect(result.stdout).not.toContain('from-default');
      await expect(readFile(path.join(directory, '.agents/wobblys/templated-wobbly/WOBBLY.md'), 'utf8')).resolves.toContain('Keep from-cli healthy');
      await expect(readFile(path.join(directory, '.agents/wobblys/templated-wobbly/scripts/render.sh'), 'utf8')).resolves.toContain('echo from-cli from-cli');
      await expect(readFile(path.join(directory, '.agents/wobblys/templated-wobbly/references/render.md'), 'utf8')).resolves.toContain('Optional: from-cli');
      const scriptMode = (await stat(path.join(directory, '.agents/wobblys/templated-wobbly/scripts/render.sh'))).mode;
      expect(scriptMode & 0o777).toBe(0o755);
    });
  });

  test('add dry-run renders and validates adaptations without writing files', async () => {
    await withTempDir(async (directory) => {
      const result = await runJson([
        'add',
        'templated-wobbly',
        '--ref',
        'test-ref',
        '--dry-run',
        '--adapt',
        'required_value=from-cli',
      ], directory);

      expect(result.code).toBe(0);
      expect(result.json.data).toMatchObject({ dryRun: true, filesWritten: [] });
      expect(result.json.data.adaptationsApplied).toEqual(['optional_value', 'required_value']);
      await expect(readFile(path.join(directory, '.agents/wobblys/templated-wobbly/WOBBLY.md'), 'utf8')).rejects.toThrow();
    });
  });

  test('add rejects missing required and unknown adaptation input keys', async () => {
    await withTempDir(async (directory) => {
      const missing = await runJson(['add', 'templated-wobbly', '--ref', 'test-ref', '--dry-run'], directory);
      expect(missing.code).toBe(65);
      expect(missing.json.errors).toContainEqual(expect.objectContaining({ code: 'MISSING_REQUIRED_ADAPTATION', field: 'required_value' }));

      const unknown = await runJson([
        'add',
        'templated-wobbly',
        '--ref',
        'test-ref',
        '--dry-run',
        '--adapt',
        'required_value=ok',
        '--adapt',
        'unknown_key=value',
      ], directory);
      expect(unknown.code).toBe(65);
      expect(unknown.json.errors).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_ADAPTATION_INPUT_KEY', field: 'unknown_key' }));
    });
  });

  test('add rejects invalid adaptation files and flag syntax', async () => {
    await withTempDir(async (directory) => {
      const adaptFile = path.join(directory, 'adaptations.json');
      await writeFile(adaptFile, JSON.stringify({ required_value: 123 }), 'utf8');

      const invalidFile = await runJson([
        'add',
        'templated-wobbly',
        '--ref',
        'test-ref',
        '--dry-run',
        '--adapt-file',
        adaptFile,
      ], directory);
      expect(invalidFile.code).toBe(65);
      expect(invalidFile.json.errors).toContainEqual(expect.objectContaining({ code: 'ADAPT_FILE_VALUE_INVALID_TYPE', field: 'required_value' }));

      const invalidFlag = await runJson(['add', 'templated-wobbly', '--adapt', 'required_value'], directory);
      expect(invalidFlag.code).toBe(64);
      expect(invalidFlag.json.errors).toContainEqual(expect.objectContaining({ code: 'ADAPT_FLAG_INVALID' }));
    });
  });

  test('add rejects unknown and unresolved adaptation tokens before writing', async () => {
    await withTempDir(async (directory) => {
      const withUnknownSupportToken = memoryCatalogClient({
        'test-ref:wobblys/templated-wobbly/references/render.md': 'Unknown {{adapt.unknown_key}}\n',
      });
      const unknown = await runJson([
        'add',
        'templated-wobbly',
        '--ref',
        'test-ref',
        '--dry-run',
        '--adapt',
        'required_value=ok',
      ], directory, withUnknownSupportToken);
      expect(unknown.code).toBe(65);
      expect(unknown.json.errors).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_ADAPTATION_TOKEN', field: 'unknown_key' }));

      const withMalformedSupportToken = memoryCatalogClient({
        'test-ref:wobblys/templated-wobbly/references/render.md': 'Malformed {{ adapt .required_value }}\n',
      });
      const malformed = await runJson([
        'add',
        'templated-wobbly',
        '--ref',
        'test-ref',
        '--dry-run',
        '--adapt',
        'required_value=ok',
      ], directory, withMalformedSupportToken);
      expect(malformed.code).toBe(65);
      expect(malformed.json.errors).toContainEqual(expect.objectContaining({ code: 'MALFORMED_ADAPTATION_TOKEN' }));

      const unresolved = await runJson([
        'add',
        'templated-wobbly',
        '--ref',
        'test-ref',
        '--dry-run',
        '--adapt',
        'required_value={{adapt.optional_value}}',
      ], directory);
      expect(unresolved.code).toBe(65);
      expect(unresolved.json.errors).toContainEqual(expect.objectContaining({ code: 'UNRESOLVED_ADAPTATION_TOKEN' }));
    });
  });

  test('add aborts non-dry-run before any writes when support-file rendering fails', async () => {
    await withTempDir(async (directory) => {
      const withUnknownSupportToken = memoryCatalogClient({
        'test-ref:wobblys/templated-wobbly/references/render.md': 'Unknown {{adapt.unknown_key}}\n',
      });

      const result = await runJson([
        'add',
        'templated-wobbly',
        '--ref',
        'test-ref',
        '--adapt',
        'required_value=ok',
      ], directory, withUnknownSupportToken);

      expect(result.code).toBe(65);
      expect(result.json.errors).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_ADAPTATION_TOKEN', field: 'unknown_key' }));
      await expect(readFile(path.join(directory, '.agents/wobblys/templated-wobbly/WOBBLY.md'), 'utf8')).rejects.toThrow();
      await expect(readFile(path.join(directory, '.agents/wobblys/templated-wobbly/scripts/render.sh'), 'utf8')).rejects.toThrow();
      await expect(readFile(path.join(directory, '.agents/wobblys/templated-wobbly/references/render.md'), 'utf8')).rejects.toThrow();
    });
  });

  test('add validates rendered WOBBLY.md before writing any files', async () => {
    await withTempDir(async (directory) => {
      const invalidRenderedCatalog: ExamplesCatalog = {
        ...catalog,
        examples: catalog.examples.map((example) =>
          example.id === 'templated-wobbly'
            ? {
                ...example,
                wobbly: {
                  path: 'WOBBLY.md',
                  content: `---\nid: templated-wobbly\npurpose: {{adapt.required_value}}\nwatch: []\nroutines: []\n---\n`,
                },
              }
            : example
        ),
      };
      const result = await runJson([
        'add',
        'templated-wobbly',
        '--dry-run',
        '--adapt',
        'required_value=ok',
      ], directory, memoryCatalogClient({}, invalidRenderedCatalog));

      expect(result.code).toBe(65);
      expect(result.json.errors).toContainEqual(expect.objectContaining({ code: 'FRONTMATTER_ROUTINES_EMPTY' }));
      await expect(readFile(path.join(directory, '.agents/wobblys/templated-wobbly/WOBBLY.md'), 'utf8')).rejects.toThrow();
    });
  });

  test('add dry-run plans catalog-listed files without writing them', async () => {
    await withTempDir(async (directory) => {
      const result = await runJson(['add', 'ready-wobbly', '--ref', 'test-ref', '--dry-run'], directory);

      expect(result.code).toBe(0);
      expect(result.json.data).toMatchObject({
        dryRun: true,
        fileCount: 3,
        filesWritten: [],
      });
      expect(result.json.data.filesPlanned).toEqual([
        {
          sourcePath: 'wobblys/ready-wobbly/WOBBLY.md',
          destinationPath: '.agents/wobblys/ready-wobbly/WOBBLY.md',
          kind: 'wobbly',
          mode: '100644',
        },
        {
          sourcePath: 'wobblys/ready-wobbly/scripts/run.sh',
          destinationPath: '.agents/wobblys/ready-wobbly/scripts/run.sh',
          kind: 'script',
          mode: '100755',
        },
        {
          sourcePath: 'wobblys/ready-wobbly/references/guide.md',
          destinationPath: '.agents/wobblys/ready-wobbly/references/guide.md',
          kind: 'reference',
          mode: '100644',
        },
      ]);
      await expect(readFile(path.join(directory, '.agents/wobblys/ready-wobbly/WOBBLY.md'), 'utf8')).rejects.toThrow();
    });
  });

  test('install writes WOBBLY.md and only catalog-listed support files', async () => {
    await withTempDir(async (directory) => {
      const result = await runJson(['install', 'ready-wobbly', '--ref', 'test-ref'], directory);

      expect(result.code).toBe(0);
      expect(result.json.command).toBe('install');
      expect(result.json.data.filesWritten).toEqual([
        '.agents/wobblys/ready-wobbly/WOBBLY.md',
        '.agents/wobblys/ready-wobbly/scripts/run.sh',
        '.agents/wobblys/ready-wobbly/references/guide.md',
      ]);
      await expect(readFile(path.join(directory, '.agents/wobblys/ready-wobbly/example.yml'), 'utf8')).rejects.toThrow();
      await expect(readFile(path.join(directory, '.agents/wobblys/ready-wobbly/WOBBLY.md'), 'utf8')).resolves.toContain('id: ready-wobbly');
      await expect(readFile(path.join(directory, '.agents/wobblys/ready-wobbly/scripts/run.sh'), 'utf8')).resolves.toContain('echo ready');
      const wobblyMode = (await stat(path.join(directory, '.agents/wobblys/ready-wobbly/WOBBLY.md'))).mode;
      const scriptMode = (await stat(path.join(directory, '.agents/wobblys/ready-wobbly/scripts/run.sh'))).mode;
      const referenceMode = (await stat(path.join(directory, '.agents/wobblys/ready-wobbly/references/guide.md'))).mode;
      expect(wobblyMode & 0o777).toBe(0o644);
      expect(scriptMode & 0o777).toBe(0o755);
      expect(referenceMode & 0o777).toBe(0o644);
    });
  });

  test('add refuses collisions unless forced', async () => {
    await withTempDir(async (directory) => {
      await mkdir(path.join(directory, '.agents/wobblys/ready-wobbly'), { recursive: true });
      await writeFile(path.join(directory, '.agents/wobblys/ready-wobbly/WOBBLY.md'), 'existing', 'utf8');

      const blocked = await runJson(['add', 'ready-wobbly'], directory);
      expect(blocked.code).toBe(65);
      expect(blocked.json).toMatchObject({ ok: false, exitCode: 65 });
      expect(blocked.json.data.collisions).toEqual([
        '.agents/wobblys/ready-wobbly/',
        '.agents/wobblys/ready-wobbly/WOBBLY.md',
      ]);

      const forced = await runJson(['add', 'ready-wobbly', '--force'], directory);
      expect(forced.code).toBe(0);
      expect(forced.json.data.overwritten).toBe(true);
      await expect(readFile(path.join(directory, '.agents/wobblys/ready-wobbly/WOBBLY.md'), 'utf8')).resolves.toContain('id: ready-wobbly');
    });
  });

  test('install planner validates paths, support files, and file modes before writes', async () => {
    await withTempDir(async (directory) => {
      const entry = catalog.examples[0]!;
      const result = createWobblyInstallPlan({ entry, installRoot: directory });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new TypeError('Expected install plan to be valid.');
      }

      expect(result.plan.destinationDirectory).toBe(path.join(directory, '.agents/wobblys/ready-wobbly'));
      expect(result.plan.files).toEqual([
        {
          sourcePath: 'wobblys/ready-wobbly/WOBBLY.md',
          destinationPath: path.join(directory, '.agents/wobblys/ready-wobbly/WOBBLY.md'),
          kind: 'wobbly',
          mode: '100644',
        },
        {
          sourcePath: 'wobblys/ready-wobbly/scripts/run.sh',
          destinationPath: path.join(directory, '.agents/wobblys/ready-wobbly/scripts/run.sh'),
          kind: 'script',
          mode: '100755',
        },
        {
          sourcePath: 'wobblys/ready-wobbly/references/guide.md',
          destinationPath: path.join(directory, '.agents/wobblys/ready-wobbly/references/guide.md'),
          kind: 'reference',
          mode: '100644',
        },
      ]);
      expect(result.plan.files.some((file) => file.sourcePath.endsWith('/example.yml'))).toBe(false);
    });
  });

  test('install planner rejects unsafe catalog source and support paths', async () => {
    await withTempDir(async (directory) => {
      const unsafeEntry: ExamplesCatalog['examples'][number] = {
        ...catalog.examples[0]!,
        scripts: ['scripts/../escape.sh'],
        references: ['other/guide.md'],
        source: {
          directory: 'wobblys/other-wobbly',
          url: 'https://github.com/universe-backwards/wobblies-library/tree/master/wobblys/other-wobbly',
        },
      };

      const result = createWobblyInstallPlan({ entry: unsafeEntry, installRoot: directory });
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new TypeError('Expected install plan to be invalid.');
      }

      const codes = result.errors.map((error) => error.code);
      expect(codes).toContain('INVALID_CATALOG_SOURCE_DIRECTORY');
      expect(codes).toContain('INVALID_CATALOG_PATH');
      expect(codes).toContain('INVALID_CATALOG_SUPPORT_PATH');
    });
  });

  test('pr open rejects --allow-deprecated as a non-public flag', async () => {
    await withTempDir(async (directory) => {
      const result = await runJson(['pr', 'open', 'ready-wobbly', '--repo', 'acme/widgets', '--allow-deprecated'], directory);

      expect(result.code).toBe(64);
      expect(result.json).toMatchObject({
        command: 'pr open',
        ok: false,
        exitCode: 64,
      });
      expect(result.json.summary).toContain("Unknown option '--allow-deprecated'");
    });
  });

  test('deprecated examples are blocked by default and allowed with explicit flag', async () => {
    await withTempDir(async (directory) => {
      const blocked = await runJson(['add', 'deprecated-wobbly'], directory);
      expect(blocked.code).toBe(65);
      expect(blocked.json.errors[0].code).toBe('DEPRECATED_EXAMPLE_BLOCKED');
      expect(blocked.json.data.adaptationsApplied).toEqual([]);

      const allowed = await runJson(['add', 'deprecated-wobbly', '--allow-deprecated'], directory);
      expect(allowed.code).toBe(0);
      await expect(readFile(path.join(directory, '.agents/wobblys/deprecated-wobbly/WOBBLY.md'), 'utf8')).resolves.toContain('Deprecated wobbly');
    });
  });
});

describe('wobbly CLI validation', () => {
  test('validate reports cron, unknown key, body, and slug errors with exit 65', async () => {
    await withTempDir(async (directory) => {
      const wobblyPath = path.join(directory, '.agents/wobblys/path-id/WOBBLY.md');
      await mkdir(path.dirname(wobblyPath), { recursive: true });
      await writeFile(
        wobblyPath,
        `---
id: wrong-id
purpose: Bad wobbly
watch: []
routines:
  - do bad things
schedule: "70 99 * * *"
readiness: adapt-before-use
---
`,
        'utf8'
      );

      const result = await runJson(['validate', wobblyPath], directory);
      expect(result.code).toBe(65);
      const codes = result.json.errors.map((error: { code: string }) => error.code);
      expect(codes).toContain('FRONTMATTER_SCHEDULE_INVALID_CRON');
      expect(codes).toContain('FRONTMATTER_CATALOG_METADATA_NOT_ALLOWED');
      expect(codes).toContain('WOBBLY_BODY_MISSING');
      // Schema errors are returned before path consistency checks because the wobbly is not canonical yet.
    });
  });

  test('validate enforces directory slug consistency for runtime wobbly files', async () => {
    await withTempDir(async (directory) => {
      const wobblyPath = path.join(directory, '.agents/wobblys/path-id/WOBBLY.md');
      await mkdir(path.dirname(wobblyPath), { recursive: true });
      await writeFile(
        wobblyPath,
        readyWobbly.replace('id: ready-wobbly', 'id: wrong-id'),
        'utf8'
      );

      const result = await runJson(['validate', wobblyPath], directory);
      expect(result.code).toBe(65);
      expect(result.json.errors).toContainEqual(expect.objectContaining({ code: 'WOBBLY_ID_PATH_MISMATCH' }));
    });
  });

  test('validate --all discovers runtime WOBBLY.md files and supports dry-run no-op output', async () => {
    await withTempDir(async (directory) => {
      const goodPath = path.join(directory, '.agents/wobblys/ready-wobbly/WOBBLY.md');
      const badPath = path.join(directory, '.agents/wobblys/bad-wobbly/WOBBLY.md');
      await mkdir(path.dirname(goodPath), { recursive: true });
      await mkdir(path.dirname(badPath), { recursive: true });
      await writeFile(goodPath, readyWobbly, 'utf8');
      await writeFile(badPath, readyWobbly.replace('id: ready-wobbly', 'name: bad-wobbly'), 'utf8');

      const result = await runJson(['validate', '--all', '--dry-run'], directory);
      expect(result.code).toBe(65);
      expect(result.json.data).toMatchObject({ dryRun: true, fileCount: 2, validCount: 1, invalidCount: 1 });
      expect(result.json.warnings).toContainEqual(expect.objectContaining({ code: 'VALIDATE_DRY_RUN_NOOP' }));
      expect(result.json.errors).toContainEqual(expect.objectContaining({ code: 'FRONTMATTER_LEGACY_KEY_NOT_ALLOWED' }));
    });
  });

  test('usage errors use exit code 64', async () => {
    await withTempDir(async (directory) => {
      const result = await runJson(['validate'], directory);
      expect(result.code).toBe(64);
      expect(result.json).toMatchObject({ ok: false, exitCode: 64 });
    });
  });
});

describe('wobbly CLI catalog and cron helpers', () => {
  test('unsupported catalog schema versions fail closed', () => {
    const result = parseExamplesCatalogValue({ value: { ...catalog, schemaVersion: 999 }, path: 'examples.json' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({ code: 'unsupported_catalog_schema_version' }));
    }
  });

  test('cron validator returns field-level reasons', () => {
    expect(validateCronExpression({ cronExpression: '0 9 * * 1-5' })).toMatchObject({ ok: true });
    expect(validateCronExpression({ cronExpression: '99 9 * * *' })).toMatchObject({
      ok: false,
      reason: 'cron:minute value out of range',
    });
  });
});
