import { expectedWobblieIdFromPath, toDisplayPath } from './fs-utils';
import { knownAdaptationKeys, renderAdaptationTokens, type AdaptationResolution } from './adaptations';
import { issue } from './issues';
import type { CatalogClient, CliIssue, InstallFilePlan } from './types';
import { validateRuntimeWobblieMarkdown } from './validation/runtime';
import type { CatalogExample } from '../examples/types';

export type RenderedWobblieInstallFile = InstallFilePlan & {
  content: string;
};

export async function prepareWobblieInstallFiles(args: {
  entry: CatalogExample;
  ref: string;
  catalogClient: CatalogClient;
  installRoot: string;
  files: readonly InstallFilePlan[];
  resolution: AdaptationResolution;
}): Promise<{ ok: true; files: RenderedWobblieInstallFile[] } | { ok: false; errors: CliIssue[] }> {
  const renderedFiles: RenderedWobblieInstallFile[] = [];
  const errors: CliIssue[] = [];
  const knownKeys = knownAdaptationKeys(args.entry);

  for (const file of args.files) {
    const content =
      file.kind === 'wobblie'
        ? args.entry.wobblie.content
        : await args.catalogClient.readTextFile(args.ref, file.sourcePath);
    const displayPath = toDisplayPath(args.installRoot, file.destinationPath);
    const rendered = renderAdaptationTokens({
      content,
      values: args.resolution.values,
      knownKeys,
      path: displayPath,
    });
    if (!rendered.ok) {
      errors.push(...rendered.errors);
      continue;
    }
    renderedFiles.push({ ...file, content: rendered.content });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const wobblieFile = renderedFiles.find((file) => file.kind === 'wobblie');
  if (!wobblieFile) {
    return {
      ok: false,
      errors: [issue({ code: 'INSTALL_PLAN_MISSING_WOBBLIE', message: 'Install plan did not include WOBBLIE.md.' })],
    };
  }

  const wobblieDisplayPath = toDisplayPath(args.installRoot, wobblieFile.destinationPath);
  const validation = validateRuntimeWobblieMarkdown({
    content: wobblieFile.content,
    path: wobblieDisplayPath,
    expectedId: expectedWobblieIdFromPath(wobblieDisplayPath),
  });
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  return { ok: true, files: renderedFiles };
}
