import { expectedWobblyIdFromPath, toDisplayPath } from './fs-utils';
import { knownAdaptationKeys, renderAdaptationTokens, type AdaptationResolution } from './adaptations';
import { issue } from './issues';
import type { CatalogClient, CliIssue, InstallFilePlan } from './types';
import { validateRuntimeWobblyMarkdown } from './validation/runtime';
import type { CatalogExample } from '../examples/types';

export type RenderedWobblyInstallFile = InstallFilePlan & {
  content: string;
};

export async function prepareWobblyInstallFiles(args: {
  entry: CatalogExample;
  ref: string;
  catalogClient: CatalogClient;
  installRoot: string;
  files: readonly InstallFilePlan[];
  resolution: AdaptationResolution;
}): Promise<{ ok: true; files: RenderedWobblyInstallFile[] } | { ok: false; errors: CliIssue[] }> {
  const renderedFiles: RenderedWobblyInstallFile[] = [];
  const errors: CliIssue[] = [];
  const knownKeys = knownAdaptationKeys(args.entry);

  for (const file of args.files) {
    const content =
      file.kind === 'wobbly'
        ? args.entry.wobbly.content
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

  const wobblyFile = renderedFiles.find((file) => file.kind === 'wobbly');
  if (!wobblyFile) {
    return {
      ok: false,
      errors: [issue({ code: 'INSTALL_PLAN_MISSING_WOBBLY', message: 'Install plan did not include WOBBLY.md.' })],
    };
  }

  const wobblyDisplayPath = toDisplayPath(args.installRoot, wobblyFile.destinationPath);
  const validation = validateRuntimeWobblyMarkdown({
    content: wobblyFile.content,
    path: wobblyDisplayPath,
    expectedId: expectedWobblyIdFromPath(wobblyDisplayPath),
  });
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  return { ok: true, files: renderedFiles };
}
