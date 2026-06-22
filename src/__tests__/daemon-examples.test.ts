import { describe, expect, test } from 'vitest';
import { getWobblieExample, listWobblieExamples, loadWobblieExamplesCatalog } from '../wobblie-examples';

describe('wobblie examples package API', () => {
  test('loads, lists, and shows examples from the packaged catalog', async () => {
    const catalog = await loadWobblieExamplesCatalog();
    const examples = await listWobblieExamples();
    const firstExample = examples[0];

    expect(catalog.schemaVersion).toBe(2);
    expect(catalog.source.repository).toBe('universe-backwards/wobblies-library');
    expect(examples.length).toBeGreaterThan(0);
    expect(examples.map((example) => example.id)).toEqual(catalog.examples.map((example) => example.id));
    expect(firstExample).toBeDefined();
    expect(firstExample?.adaptations).toBeDefined();
    expect(firstExample?.specializationIdeas).toBeDefined();

    const shown = await getWobblieExample(firstExample!.id);
    expect(shown).toMatchObject({
      id: firstExample!.id,
      wobblie: { path: 'WOBBLIE.md' },
    });

    await expect(getWobblieExample('missing-wobblie-example')).resolves.toBeNull();
  });
});
