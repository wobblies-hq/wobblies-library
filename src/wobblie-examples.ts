import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExamplesCatalogContent } from './examples/schema';
import type { CatalogExample, ExampleAdaptation, ExamplesCatalog, ValidationError } from './examples/types';

export type WobblieExample = CatalogExample;
export type WobblieExampleAdaptation = ExampleAdaptation;
export type WobblieExamplesCatalog = ExamplesCatalog;

export type LoadWobblieExamplesCatalogOptions = {
  /** Override the catalog path. Defaults to the packaged repository-root examples.json. */
  catalogPath?: string | URL | undefined;
};

export class WobblieExamplesCatalogError extends Error {
  readonly code: string;
  readonly path: string;
  readonly validationErrors: ValidationError[];

  constructor(args: { code: string; path: string; message: string; validationErrors?: ValidationError[] | undefined }) {
    super(args.message);
    this.name = 'WobblieExamplesCatalogError';
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

export async function loadWobblieExamplesCatalog(
  options: LoadWobblieExamplesCatalogOptions = {}
): Promise<WobblieExamplesCatalog> {
  const catalogPath = options.catalogPath ?? defaultCatalogPath();
  const displayPath = catalogPathForDisplay(catalogPath);

  let content: string;
  try {
    content = await readFile(catalogPath, 'utf8');
  } catch (error) {
    throw new WobblieExamplesCatalogError({
      code: 'CATALOG_READ_FAILED',
      path: displayPath,
      message: `Unable to read wobblie examples catalog at ${displayPath}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const parsed = parseExamplesCatalogContent({ content, path: displayPath });
  if (!parsed.ok) {
    throw new WobblieExamplesCatalogError({
      code: 'INVALID_CATALOG',
      path: displayPath,
      message: `Wobblie examples catalog at ${displayPath} is invalid.`,
      validationErrors: parsed.errors,
    });
  }

  return parsed.value;
}

export async function listWobblieExamples(
  options: LoadWobblieExamplesCatalogOptions = {}
): Promise<WobblieExample[]> {
  const catalog = await loadWobblieExamplesCatalog(options);
  return [...catalog.examples];
}

export async function getWobblieExample(
  id: string,
  options: LoadWobblieExamplesCatalogOptions = {}
): Promise<WobblieExample | null> {
  const catalog = await loadWobblieExamplesCatalog(options);
  return catalog.examples.find((example) => example.id === id) ?? null;
}
