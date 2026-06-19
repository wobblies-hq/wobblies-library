export const WOBBLY_CLI_VERSION = '2.0.2';

export const EXIT_CODE_SUCCESS = 0;
export const EXIT_CODE_USAGE = 64;
export const EXIT_CODE_DATA = 65;
export const EXIT_CODE_INTERNAL = 70;

export const SOURCE_REPO = 'universe-backwards/wobblies-library';
export const SOURCE_REPO_OWNER = 'wobblies';
export const SOURCE_REPO_NAME = 'wobblys';
export const DEFAULT_CATALOG_REF = 'master';
export const CATALOG_PATH = 'examples.json';
export const SUPPORTED_CATALOG_SCHEMA_VERSION = 2;
export const CATALOG_SOURCE_BASE_DIRECTORY = 'wobblys';

export const DEFAULT_WOBBLY_ROOT = '.agents/wobblys';
export const WOBBLY_FILENAME = 'WOBBLY.md';
export const WOBBLY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ACTIVATION_CAVEAT =
  'Scaffolding writes files only. The wobbly is not active until the change is merged to the target repo default branch and ingested by Wobbly.';

export const canonicalFrontmatterKeys = [
  'id',
  'purpose',
  'watch',
  'routines',
  'deny',
  'schedule',
] as const;

export const legacyFrontmatterKeyToCanonicalField = {
  name: 'id',
  description: 'purpose',
  triggers: 'watch',
  actions: 'routines',
  disallowed: 'deny',
} as const;

export const catalogMetadataFrontmatterKeys = [
  'title',
  'summary',
  'status',
  'readiness',
  'showOnWebsite',
  'showInDashboard',
  'fit',
  'requirements',
  'scripts',
  'references',
  'source',
  'wobbly',
  'riskTier',
  'activationMode',
  'display',
  'metadata',
  'bestFor',
] as const;

export const commandAliases = {
  list: 'list',
  show: 'show',
  add: 'add',
  install: 'add',
  validate: 'validate',
} as const;

export type CommandName = keyof typeof commandAliases;
export type ResolvedCommandName = (typeof commandAliases)[CommandName];
