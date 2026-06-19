import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExamplesCatalogContent } from './examples/schema';
import type { CatalogExample, ExampleAdaptation, ExamplesCatalog, ValidationError } from './examples/types';

export type WobblyExample = CatalogExample;
export type WobblyExampleAdaptation = ExampleAdaptation;
export type WobblyExamplesCatalog = ExamplesCatalog;

export type LoadWobblyExamplesCatalogOptions = {
  /** Override the catalog path. Defaults to the packaged repository-root examples.json. */
  catalogPath?: string | URL | undefined;
};

export class WobblyExamplesCatalogError extends Error {
  readonly code: string;
  readonly path: string;
  readonly validationErrors: ValidationError[];

  constructor(args: { code: string; path: string; message: string; validationErrors?: ValidationError[] | undefined }) {
    super(args.message);
    this.name = 'WobblyExamplesCatalogError';
    this.code = args.code;
    this.path = args.path;
    this.validationErrors = args.validationErrors ?? [];
  }
}

function defaultCatalogPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'examples.json');
}

function catalogPathForDisplay(catalogPath: string | URL): string {
  return catalogPath instanceof URL ? catalogPath.href : catalogPath;
}

export async function loadWobblyExamplesCatalog(
  options: LoadWobblyExamplesCatalogOptions = {}
): Promise<WobblyExamplesCatalog> {
  const catalogPath = options.catalogPath ?? defaultCatalogPath();
  const displayPath = catalogPathForDisplay(catalogPath);

  let content: string;
  try {
    content = await readFile(catalogPath, 'utf8');
  } catch (error) {
    throw new WobblyExamplesCatalogError({
      code: 'CATALOG_READ_FAILED',
      path: displayPath,
      message: `Unable to read wobbly examples catalog at ${displayPath}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const parsed = parseExamplesCatalogContent({ content, path: displayPath });
  if (!parsed.ok) {
    throw new WobblyExamplesCatalogError({
      code: 'INVALID_CATALOG',
      path: displayPath,
      message: `Wobbly examples catalog at ${displayPath} is invalid.`,
      validationErrors: parsed.errors,
    });
  }

  return parsed.value;
}

export async function listWobblyExamples(
  options: LoadWobblyExamplesCatalogOptions = {}
): Promise<WobblyExample[]> {
  const catalog = await loadWobblyExamplesCatalog(options);
  return [...catalog.examples];
}

export async function getWobblyExample(
  id: string,
  options: LoadWobblyExamplesCatalogOptions = {}
): Promise<WobblyExample | null> {
  const catalog = await loadWobblyExamplesCatalog(options);
  return catalog.examples.find((example) => example.id === id) ?? null;
}
