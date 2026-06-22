export function getRootHelpText(): string {
  return `wobblie - Wobblie wobblie catalog CLI

Usage:
  wobblie list [--ref <sha|branch|tag>] [--json]
  wobblie show <example-id> [--ref <sha|branch|tag>] [--json]
  wobblie add <example-id> [--ref <sha|branch|tag>] [--adapt key=value] [--adapt-file adaptations.json] [--dry-run] [--force] [--allow-deprecated] [--json]
  wobblie install <example-id> [same flags as add]
  wobblie pr open <example-id> --repo owner/repo [--ref <sha|branch|tag>] [--base <branch>] [--adapt key=value] [--adapt-file adaptations.json] [--force] [--json]
  wobblie pr list --repo owner/repo [--json]
  wobblie validate <path> [--dry-run] [--json]
  wobblie validate --all [--dry-run] [--json]

Exit codes:
  0   success
  64  usage error
  65  validation or catalog/data error
  70  internal or I/O error`;
}

export function getCommandHelpText(command: string): string {
  if (command === 'list') {
    return 'Usage: wobblie list [--ref <sha|branch|tag>] [--json]\n\nReads root examples.json and lists catalog example IDs.';
  }

  if (command === 'show') {
    return 'Usage: wobblie show <example-id> [--ref <sha|branch|tag>] [--json]\n\nShows catalog metadata, support files, integrations, structured adaptation inputs, and optional specialization ideas.';
  }

  if (command === 'add') {
    return 'Usage: wobblie add <example-id> [--ref <sha|branch|tag>] [--adapt key=value] [--adapt-file adaptations.json] [--dry-run] [--force] [--allow-deprecated] [--json]\n\nScaffolds catalog-listed files into .wobblies/<id>/ without activating the wobblie. Adaptation values render documented {{adapt.key}} tokens before validation and writes.';
  }

  if (command === 'pr') {
    return 'Usage: wobblie pr <open|list> [--json]\n\nOpens and lists wobblie install pull requests in a target GitHub repository.';
  }

  if (command === 'pr open') {
    return 'Usage: wobblie pr open <example-id> --repo owner/repo [--ref <sha|branch|tag>] [--base <branch>] [--adapt key=value] [--adapt-file adaptations.json] [--force] [--json]\n\nRenders a catalog example and opens an idempotent GitHub pull request from a deterministic wobblie/wobblie-installs/<example-id> branch. Raw adaptation values are not included in output or PR markers.';
  }

  if (command === 'pr list') {
    return 'Usage: wobblie pr list --repo owner/repo [--json]\n\nLists wobblie install pull requests by hidden marker and reconciles deterministic wobblie/wobblie-installs/* branches.';
  }

  if (command === 'validate') {
    return 'Usage: wobblie validate <path> [--dry-run] [--json]\n       wobblie validate --all [--dry-run] [--json]\n\nStrictly validates runtime WOBBLIE.md frontmatter and body.';
  }

  return getRootHelpText();
}
