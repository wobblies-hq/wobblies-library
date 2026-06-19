export type ValidationError = {
  code: string;
  path: string;
  fieldPath?: string | undefined;
  message: string;
};

export type ValidationResult<TValue> =
  | {
      ok: true;
      value: TValue;
      errors: [];
    }
  | {
      ok: false;
      errors: ValidationError[];
    };

export type ExampleStatus = 'draft' | 'ready' | 'deprecated';
export type ExampleReadiness = 'direct-copy' | 'adapt-before-use';
export type JobToBeDone =
  | 'maintain-and-modernize'
  | 'organize'
  | 'document'
  | 'review-with-confidence'
  | 'build-production-grade-typescript'
  | 'operate'
  | 'explain'
  | 'plan'
  | 'wobbly-operations';
export type IntegrationSlug = 'github' | 'linear' | 'slack' | 'sentry';

export type ExampleAdaptation = {
  key: string;
  label: string;
  description: string;
  required: boolean;
  default?: string | undefined;
  suggestions?: string[] | undefined;
};

export type ExampleMetadata = {
  id: string;
  title: string;
  status: ExampleStatus;
  summary: string;
  readiness: ExampleReadiness;
  showOnWebsite: boolean;
  showInDashboard: boolean;
  fit: {
    jobsToBeDone: JobToBeDone[];
    bestFor: string[];
    notFor: string[];
  };
  requirements: {
    requiredIntegrations: IntegrationSlug[];
    optionalIntegrations: IntegrationSlug[];
    other: string[];
  };
  adaptations: ExampleAdaptation[];
  specializationIdeas: string[];
};

export type CatalogExample = ExampleMetadata & {
  wobbly: {
    path: 'WOBBLY.md';
    content: string;
  };
  scripts: string[];
  references: string[];
  source: {
    directory: string;
    url: string;
  };
};

export type ExamplesCatalog = {
  schemaVersion: 2;
  source: {
    repository: 'universe-backwards/wobblies-library';
    baseDirectory: 'wobblys';
  };
  examples: CatalogExample[];
};

export type WobblyFrontmatter = {
  id: string;
  purpose: string;
  watch?: string[] | undefined;
  routines: string[];
  deny?: string[] | undefined;
  schedule?: string | undefined;
};

export type WobblyPackage = {
  directoryName: string;
  directoryPath: string;
  examplePath: string;
  wobblyPath: string;
};
