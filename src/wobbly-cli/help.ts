export function getRootHelpText(): string {
  return `wobbly - Wobbly wobbly catalog CLI

Usage:
  wobbly list [--ref <sha|branch|tag>] [--json]
  wobbly show <example-id> [--ref <sha|branch|tag>] [--json]
  wobbly add <example-id> [--ref <sha|branch|tag>] [--adapt key=value] [--adapt-file adaptations.json] [--dry-run] [--force] [--allow-deprecated] [--json]
  wobbly install <example-id> [same flags as add]
  wobbly pr open <example-id> --repo owner/repo [--ref <sha|branch|tag>] [--base <branch>] [--adapt key=value] [--adapt-file adaptations.json] [--force] [--json]
  wobbly pr list --repo owner/repo [--json]
  wobbly validate <path> [--dry-run] [--json]
  wobbly validate --all [--dry-run] [--json]

Exit codes:
  0   success
  64  usage error
  65  validation or catalog/data error
  70  internal or I/O error`;
}

export function getCommandHelpText(command: string): string {
  if (command === 'list') {
    return 'Usage: wobbly list [--ref <sha|branch|tag>] [--json]\n\nReads root examples.json and lists catalog example IDs.';
  }

  if (command === 'show') {
    return 'Usage: wobbly show <example-id> [--ref <sha|branch|tag>] [--json]\n\nShows catalog metadata, support files, integrations, structured adaptation inputs, and optional specialization ideas.';
  }

  if (command === 'add') {
    return 'Usage: wobbly add <example-id> [--ref <sha|branch|tag>] [--adapt key=value] [--adapt-file adaptations.json] [--dry-run] [--force] [--allow-deprecated] [--json]\n\nScaffolds catalog-listed files into .agents/wobblys/<id>/ without activating the wobbly. Adaptation values render documented {{adapt.key}} tokens before validation and writes.';
  }

  if (command === 'pr') {
    return 'Usage: wobbly pr <open|list> [--json]\n\nOpens and lists wobbly install pull requests in a target GitHub repository.';
  }

  if (command === 'pr open') {
    return 'Usage: wobbly pr open <example-id> --repo owner/repo [--ref <sha|branch|tag>] [--base <branch>] [--adapt key=value] [--adapt-file adaptations.json] [--force] [--json]\n\nRenders a catalog example and opens an idempotent GitHub pull request from a deterministic wobbly/wobbly-installs/<example-id> branch. Raw adaptation values are not included in output or PR markers.';
  }

  if (command === 'pr list') {
    return 'Usage: wobbly pr list --repo owner/repo [--json]\n\nLists wobbly install pull requests by hidden marker and reconciles deterministic wobbly/wobbly-installs/* branches.';
  }

  if (command === 'validate') {
    return 'Usage: wobbly validate <path> [--dry-run] [--json]\n       wobbly validate --all [--dry-run] [--json]\n\nStrictly validates runtime WOBBLY.md frontmatter and body.';
  }

  return getRootHelpText();
}
