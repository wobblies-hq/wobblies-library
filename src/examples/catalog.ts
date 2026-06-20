import { constants } from 'node:fs';
import { access, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { findPublicSafetyErrors } from './public-safety';
import { isKebabCaseSlug, isSupportPath, toPosixPath } from './paths';
import { parseWobblyMarkdown, parseExampleYaml } from './schema';
import type {
  CatalogExample,
  WobblyPackage,
  ExampleAdaptation,
  ExampleMetadata,
  ExamplesCatalog,
  ValidationError,
  ValidationResult,
} from './types';
import { machineError, normalizeThrownMessage } from './validation';

const SOURCE_REPOSITORY = 'wobblie-hq/wobblies-library';
const SOURCE_BASE_DIRECTORY = 'wobblies';
const DEFAULT_PUBLICATION_REF = 'master';
const ROOT_CATALOG_PATH = 'examples.json';
const ALLOWED_WOBBLY_PACKAGE_ENTRIES = new Set(['WOBBLIE.md', 'example.yml', 'scripts', 'references']);
const MUSTACHE_TOKEN_PATTERN = /{{\s*([^{}]*?)\s*}}/g;
const ADAPTATION_EXPRESSION_PREFIX_PATTERN = /^adapt(?:$|[.\s])/;
const ADAPTATION_TOKEN_EXPRESSION_PATTERN = /^adapt\.([a-z][a-z0-9_]*)$/;

export async function generateCatalogFromRepository(
  repoRoot: string,
  options: { publicationRef?: string } = {}
): Promise<ValidationResult<ExamplesCatalog>> {
  const packagesResult = await discoverWobblyPackages(repoRoot);
  if (!packagesResult.ok) {
    return packagesResult;
  }

  const packageResults = await Promise.all(
    packagesResult.value.map((wobblyPackage) => loadCatalogExample(repoRoot, wobblyPackage, options))
  );

  const errors = packageResults.flatMap((result) => result.errors);
  errors.push(...findDuplicateIdErrors(packageResults));

  if (errors.length > 0) {
    return { ok: false, errors: sortValidationErrors(errors) };
  }

  const examples = packageResults
    .flatMap((result) => (result.entry ? [result.entry] : []))
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    ok: true,
    value: {
      schemaVersion: 2,
      source: {
        repository: SOURCE_REPOSITORY,
        baseDirectory: SOURCE_BASE_DIRECTORY,
      },
      examples,
    },
    errors: [],
  };
}

export async function writeGeneratedCatalog(repoRoot: string): Promise<ValidationResult<ExamplesCatalog>> {
  const result = await generateCatalogFromRepository(repoRoot);
  if (!result.ok) {
    return result;
  }

  await writeFile(join(repoRoot, ROOT_CATALOG_PATH), serializeCatalog(result.value), 'utf8');
  return result;
}

export async function validateCatalogFile(repoRoot: string): Promise<ValidationResult<ExamplesCatalog>> {
  const generated = await generateCatalogFromRepository(repoRoot);
  if (!generated.ok) {
    return generated;
  }

  const catalogPath = join(repoRoot, ROOT_CATALOG_PATH);
  let current: string;
  try {
    current = await readFile(catalogPath, 'utf8');
  } catch (error) {
    return {
      ok: false,
      errors: [
        machineError({
          code: 'missing_catalog',
          path: ROOT_CATALOG_PATH,
          message: `Unable to read examples.json: ${normalizeThrownMessage(error)}`,
        }),
      ],
    };
  }

  const expected = serializeCatalog(generated.value);
  if (current !== expected) {
    return {
      ok: false,
      errors: [
        machineError({
          code: 'catalog_drift',
          path: ROOT_CATALOG_PATH,
          message: 'examples.json does not match generated output. Run bun run generate:examples.',
        }),
      ],
    };
  }

  return generated;
}

export function serializeCatalog(catalog: ExamplesCatalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}


function catalogAdaptations(adaptations: readonly ExampleAdaptation[]): ExampleAdaptation[] {
  return [...adaptations]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((adaptation) => ({
      key: adaptation.key,
      label: adaptation.label,
      description: adaptation.description,
      required: adaptation.required,
      ...(adaptation.default !== undefined ? { default: adaptation.default } : {}),
      ...(adaptation.suggestions !== undefined ? { suggestions: [...adaptation.suggestions] } : {}),
    }));
}

type LoadedPackageResult = {
  directoryName: string;
  examplePath: string;
  exampleId?: string | undefined;
  entry?: CatalogExample;
  errors: ValidationError[];
};

async function discoverWobblyPackages(repoRoot: string): Promise<ValidationResult<WobblyPackage[]>> {
  const wobblysDirectory = join(repoRoot, SOURCE_BASE_DIRECTORY);
  try {
    const stat = await lstat(wobblysDirectory);
    if (!stat.isDirectory()) {
      return {
        ok: false,
        errors: [
          machineError({
            code: 'invalid_repository_layout',
            path: SOURCE_BASE_DIRECTORY,
            message: 'wobblys must be a directory.',
          }),
        ],
      };
    }
  } catch (error) {
    return {
      ok: false,
      errors: [
        machineError({
          code: 'invalid_repository_layout',
          path: SOURCE_BASE_DIRECTORY,
          message: `Unable to read wobblys directory: ${normalizeThrownMessage(error)}`,
        }),
      ],
    };
  }

  const entries = await readdir(wobblysDirectory, { withFileTypes: true });
  const packages: WobblyPackage[] = [];
  const errors: ValidationError[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const entryPath = `wobblys/${entry.name}`;
    if (!entry.isDirectory()) {
      errors.push(
        machineError({
          code: 'invalid_repository_layout',
          path: entryPath,
          message: 'Entries directly under wobblys/ must be wobbly package directories.',
        })
      );
      continue;
    }

    if (!isKebabCaseSlug(entry.name)) {
      errors.push(
        machineError({
          code: 'invalid_wobbly_id',
          path: entryPath,
          message: 'Wobbly package directory names must be stable kebab-case slugs.',
        })
      );
      continue;
    }

    packages.push({
      directoryName: entry.name,
      directoryPath: entryPath,
      wobblyPath: `${entryPath}/WOBBLIE.md`,
      examplePath: `${entryPath}/example.yml`,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors: sortValidationErrors(errors) };
  }

  return { ok: true, value: packages, errors: [] };
}

async function loadCatalogExample(
  repoRoot: string,
  wobblyPackage: WobblyPackage,
  options: { publicationRef?: string }
): Promise<LoadedPackageResult> {
  const errors: ValidationError[] = [];
  const wobblyDirectoryAbsolutePath = join(repoRoot, wobblyPackage.directoryPath);

  errors.push(...(await validatePackageTopLevelEntries(wobblyDirectoryAbsolutePath, wobblyPackage.directoryPath)));

  const wobblyContent = await readRequiredTextFile(repoRoot, wobblyPackage.wobblyPath, 'missing_wobbly_md');
  if (!wobblyContent.ok) {
    errors.push(...wobblyContent.errors);
  }

  const exampleContent = await readRequiredTextFile(repoRoot, wobblyPackage.examplePath, 'missing_example_yml');
  if (!exampleContent.ok) {
    errors.push(...exampleContent.errors);
  }

  let exampleMetadata: ExampleMetadata | undefined;
  let wobblyFrontmatterId: string | undefined;

  if (exampleContent.ok) {
    const parsedExample = parseExampleYaml({ content: exampleContent.value, path: wobblyPackage.examplePath });
    if (parsedExample.ok) {
      exampleMetadata = parsedExample.value;
    } else {
      errors.push(...parsedExample.errors);
    }
  }

  if (wobblyContent.ok) {
    const parsedWobbly = parseWobblyMarkdown({ content: wobblyContent.value, path: wobblyPackage.wobblyPath });
    if (parsedWobbly.ok) {
      wobblyFrontmatterId = parsedWobbly.value.frontmatter.id;
    } else {
      errors.push(...parsedWobbly.errors);
    }
  }

  if (exampleMetadata && exampleMetadata.id !== wobblyPackage.directoryName) {
    errors.push(
      machineError({
        code: 'id_mismatch',
        path: wobblyPackage.examplePath,
        fieldPath: 'id',
        message: `example.yml id ${exampleMetadata.id} must match directory id ${wobblyPackage.directoryName}.`,
      })
    );
  }

  if (wobblyFrontmatterId && wobblyFrontmatterId !== wobblyPackage.directoryName) {
    errors.push(
      machineError({
        code: 'id_mismatch',
        path: wobblyPackage.wobblyPath,
        fieldPath: 'id',
        message: `WOBBLIE.md id ${wobblyFrontmatterId} must match directory id ${wobblyPackage.directoryName}.`,
      })
    );
  }

  if (exampleMetadata && wobblyFrontmatterId && exampleMetadata.id !== wobblyFrontmatterId) {
    errors.push(
      machineError({
        code: 'id_mismatch',
        path: wobblyPackage.examplePath,
        fieldPath: 'id',
        message: `example.yml id ${exampleMetadata.id} must match WOBBLIE.md id ${wobblyFrontmatterId}.`,
      })
    );
  }

  const supportPaths = await discoverSupportPaths(repoRoot, wobblyPackage.directoryPath);
  errors.push(...supportPaths.errors);

  if (exampleMetadata && wobblyContent.ok) {
    errors.push(
      ...(await validateDeclaredAdaptationTokens({
        repoRoot,
        wobblyPackage,
        wobblyContent: wobblyContent.value,
        supportPaths: [...supportPaths.scripts, ...supportPaths.references],
        exampleMetadata,
      }))
    );
  }

  if (!exampleMetadata || !wobblyContent.ok || errors.length > 0) {
    return {
      directoryName: wobblyPackage.directoryName,
      examplePath: wobblyPackage.examplePath,
      exampleId: exampleMetadata?.id,
      errors,
    };
  }

  const publicationRef = options.publicationRef ?? DEFAULT_PUBLICATION_REF;
  const sourceDirectory = `${SOURCE_BASE_DIRECTORY}/${wobblyPackage.directoryName}`;

  return {
    directoryName: wobblyPackage.directoryName,
    examplePath: wobblyPackage.examplePath,
    exampleId: exampleMetadata.id,
    entry: {
      id: exampleMetadata.id,
      title: exampleMetadata.title,
      status: exampleMetadata.status,
      summary: exampleMetadata.summary,
      readiness: exampleMetadata.readiness,
      showOnWebsite: exampleMetadata.showOnWebsite,
      showInDashboard: exampleMetadata.showInDashboard,
      fit: {
        jobsToBeDone: exampleMetadata.fit.jobsToBeDone,
        bestFor: exampleMetadata.fit.bestFor,
        notFor: exampleMetadata.fit.notFor,
      },
      requirements: {
        requiredIntegrations: exampleMetadata.requirements.requiredIntegrations,
        optionalIntegrations: exampleMetadata.requirements.optionalIntegrations,
        other: exampleMetadata.requirements.other,
      },
      adaptations: catalogAdaptations(exampleMetadata.adaptations),
      specializationIdeas: [...exampleMetadata.specializationIdeas],
      wobbly: {
        path: 'WOBBLIE.md',
        content: wobblyContent.value,
      },
      scripts: supportPaths.scripts,
      references: supportPaths.references,
      source: {
        directory: sourceDirectory,
        url: `https://github.com/${SOURCE_REPOSITORY}/tree/${publicationRef}/${sourceDirectory}`,
      },
    },
    errors: [],
  };
}

async function validatePackageTopLevelEntries(
  wobblyDirectoryAbsolutePath: string,
  wobblyDirectoryPath: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const entries = await readdir(wobblyDirectoryAbsolutePath, { withFileTypes: true });

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (ALLOWED_WOBBLY_PACKAGE_ENTRIES.has(entry.name)) {
      continue;
    }

    errors.push(
      machineError({
        code: entry.name === 'README.md' ? 'per_example_readme' : 'unsupported_support_path',
        path: `${wobblyDirectoryPath}/${entry.name}`,
        message: 'Wobbly packages may only contain WOBBLIE.md, example.yml, scripts/**, and references/**.',
      })
    );
  }

  return errors;
}

async function readRequiredTextFile(
  repoRoot: string,
  catalogPath: string,
  missingCode: 'missing_wobbly_md' | 'missing_example_yml'
): Promise<ValidationResult<string>> {
  const absolutePath = join(repoRoot, catalogPath);
  try {
    const stat = await lstat(absolutePath);
    if (!stat.isFile()) {
      return {
        ok: false,
        errors: [
          machineError({
            code: missingCode,
            path: catalogPath,
            message: `${catalogPath} must be a file.`,
          }),
        ],
      };
    }

    return { ok: true, value: await readFile(absolutePath, 'utf8'), errors: [] };
  } catch (error) {
    return {
      ok: false,
      errors: [
        machineError({
          code: missingCode,
          path: catalogPath,
          message: `Unable to read required file: ${normalizeThrownMessage(error)}`,
        }),
      ],
    };
  }
}

async function discoverSupportPaths(
  repoRoot: string,
  wobblyDirectoryPath: string
): Promise<{ scripts: string[]; references: string[]; errors: ValidationError[] }> {
  const scriptPaths = await discoverSupportDirectory(repoRoot, wobblyDirectoryPath, 'scripts');
  const referencePaths = await discoverSupportDirectory(repoRoot, wobblyDirectoryPath, 'references');

  return {
    scripts: scriptPaths.paths,
    references: referencePaths.paths,
    errors: [...scriptPaths.errors, ...referencePaths.errors],
  };
}

async function discoverSupportDirectory(
  repoRoot: string,
  wobblyDirectoryPath: string,
  supportDirectoryName: 'scripts' | 'references'
): Promise<{ paths: string[]; errors: ValidationError[] }> {
  const supportDirectoryPath = `${wobblyDirectoryPath}/${supportDirectoryName}`;
  const supportDirectoryAbsolutePath = join(repoRoot, supportDirectoryPath);
  try {
    await access(supportDirectoryAbsolutePath, constants.F_OK);
  } catch {
    return { paths: [], errors: [] };
  }

  const stat = await lstat(supportDirectoryAbsolutePath);
  if (!stat.isDirectory()) {
    return {
      paths: [],
      errors: [
        machineError({
          code: 'unsupported_support_path',
          path: supportDirectoryPath,
          message: `${supportDirectoryPath} must be a directory when present.`,
        }),
      ],
    };
  }

  const discovered = await walkSupportDirectory(repoRoot, supportDirectoryPath, supportDirectoryName);
  return {
    paths: discovered.paths.sort((left, right) => left.localeCompare(right)),
    errors: discovered.errors,
  };
}

async function walkSupportDirectory(
  repoRoot: string,
  currentDirectoryPath: string,
  supportDirectoryName: 'scripts' | 'references'
): Promise<{ paths: string[]; errors: ValidationError[] }> {
  const entries = await readdir(join(repoRoot, currentDirectoryPath), { withFileTypes: true });
  const paths: string[] = [];
  const errors: ValidationError[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = `${currentDirectoryPath}/${entry.name}`;
    const wobblyRelativePath = toPosixPath(relative(join(repoRoot, currentDirectoryPath, '..'), join(repoRoot, entryPath)));

    if (entry.isDirectory()) {
      const nested = await walkSupportDirectory(repoRoot, entryPath, supportDirectoryName);
      paths.push(...nested.paths);
      errors.push(...nested.errors);
      continue;
    }

    const supportPath = entryPath.slice(entryPath.indexOf(`${supportDirectoryName}/`));
    if (!entry.isFile() || !isSupportPath(supportPath, supportDirectoryName)) {
      errors.push(
        machineError({
          code: 'unsupported_support_path',
          path: entryPath,
          message: `Unsupported support path: ${wobblyRelativePath}.`,
        })
      );
      continue;
    }

    const absolutePath = join(repoRoot, entryPath);
    const content = await readFile(absolutePath, 'utf8');
    errors.push(...findPublicSafetyErrors({ content, path: entryPath }));

    if (supportDirectoryName === 'scripts') {
      const stat = await lstat(absolutePath);
      if (content.startsWith('#!') && (stat.mode & 0o111) === 0) {
        errors.push(
          machineError({
            code: 'script_not_executable',
            path: entryPath,
            message: 'Support scripts with a shebang must have executable file permissions.',
          })
        );
      }
    }

    paths.push(supportPath);
  }

  return { paths, errors };
}

async function validateDeclaredAdaptationTokens(args: {
  repoRoot: string;
  wobblyPackage: WobblyPackage;
  wobblyContent: string;
  supportPaths: readonly string[];
  exampleMetadata: ExampleMetadata;
}): Promise<ValidationError[]> {
  const declaredKeys = new Set(args.exampleMetadata.adaptations.map((adaptation) => adaptation.key));
  const errors = findAdaptationTokenErrors({
    content: args.wobblyContent,
    path: args.wobblyPackage.wobblyPath,
    declaredKeys,
  });

  for (const supportPath of args.supportPaths) {
    const path = `${args.wobblyPackage.directoryPath}/${supportPath}`;
    let content: string;
    try {
      content = await readFile(join(args.repoRoot, path), 'utf8');
    } catch (error) {
      errors.push(
        machineError({
          code: 'unsupported_support_path',
          path,
          message: `Unable to read support file: ${normalizeThrownMessage(error)}`,
        })
      );
      continue;
    }

    errors.push(...findAdaptationTokenErrors({ content, path, declaredKeys }));
  }

  return errors;
}

function findAdaptationTokenErrors(args: {
  content: string;
  path: string;
  declaredKeys: ReadonlySet<string>;
}): ValidationError[] {
  const errors: ValidationError[] = [];
  const reportedKeys = new Set<string>();
  const reportedMalformedTokens = new Set<string>();

  for (const token of args.content.matchAll(MUSTACHE_TOKEN_PATTERN)) {
    const rawExpression = token[1] ?? '';
    const expression = rawExpression.trim();
    if (!ADAPTATION_EXPRESSION_PREFIX_PATTERN.test(expression)) {
      continue;
    }

    const expressionMatch = ADAPTATION_TOKEN_EXPRESSION_PATTERN.exec(expression);
    if (!expressionMatch) {
      const renderedToken = token[0] ?? `{{${rawExpression}}}`;
      if (reportedMalformedTokens.has(renderedToken)) {
        continue;
      }

      reportedMalformedTokens.add(renderedToken);
      errors.push(
        machineError({
          code: 'malformed_adaptation_token',
          path: args.path,
          message: `Malformed adaptation token '${renderedToken}' is used in ${args.path}. Use '{{adapt.key}}' with a key matching ^[a-z][a-z0-9_]*$ and declare it in example.yml adaptations[].`,
        })
      );
      continue;
    }

    const key = expressionMatch[1] ?? '';
    if (args.declaredKeys.has(key) || reportedKeys.has(key)) {
      continue;
    }

    reportedKeys.add(key);
    errors.push(
      machineError({
        code: 'unknown_adaptation_token',
        path: args.path,
        message: `Adaptation token '{{adapt.${key}}}' is used in ${args.path}, but example.yml does not declare adaptations[].key '${key}'. Add the adaptation metadata or fix the token spelling.`,
      })
    );
  }

  return errors;
}

function findDuplicateIdErrors(results: readonly LoadedPackageResult[]): ValidationError[] {
  const pathsById = new Map<string, string[]>();
  for (const result of results) {
    if (!result.exampleId) {
      continue;
    }

    pathsById.set(result.exampleId, [...(pathsById.get(result.exampleId) ?? []), result.examplePath]);
  }

  const errors: ValidationError[] = [];
  for (const [id, paths] of pathsById.entries()) {
    if (paths.length < 2) {
      continue;
    }

    for (const path of paths) {
      errors.push(
        machineError({
          code: 'duplicate_id',
          path,
          fieldPath: 'id',
          message: `Duplicate example id ${id} appears in ${paths.join(', ')}.`,
        })
      );
    }
  }

  return errors;
}

function sortValidationErrors(errors: readonly ValidationError[]): ValidationError[] {
  return [...errors].sort((left, right) => {
    const pathComparison = left.path.localeCompare(right.path);
    if (pathComparison !== 0) {
      return pathComparison;
    }

    const leftField = left.fieldPath ?? '';
    const rightField = right.fieldPath ?? '';
    const fieldComparison = leftField.localeCompare(rightField);
    if (fieldComparison !== 0) {
      return fieldComparison;
    }

    return left.code.localeCompare(right.code);
  });
}

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}
