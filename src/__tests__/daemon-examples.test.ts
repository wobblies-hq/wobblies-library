import { describe, expect, test } from 'vitest';
import { getWobblyExample, listWobblyExamples, loadWobblyExamplesCatalog } from '../wobbly-examples';

describe('wobbly examples package API', () => {
  test('loads, lists, and shows examples from the packaged catalog', async () => {
    const catalog = await loadWobblyExamplesCatalog();
    const examples = await listWobblyExamples();
    const firstExample = examples[0];

    expect(catalog.schemaVersion).toBe(2);
    expect(catalog.source.repository).toBe('universe-backwards/wobblies-library');
    expect(examples.length).toBeGreaterThan(0);
    expect(examples.map((example) => example.id)).toEqual(catalog.examples.map((example) => example.id));
    expect(firstExample).toBeDefined();
    expect(firstExample?.adaptations).toBeDefined();
    expect(firstExample?.specializationIdeas).toBeDefined();

    const shown = await getWobblyExample(firstExample!.id);
    expect(shown).toMatchObject({
      id: firstExample!.id,
      wobbly: { path: 'WOBBLY.md' },
    });

    await expect(getWobblyExample('missing-wobbly-example')).resolves.toBeNull();
  });
});
