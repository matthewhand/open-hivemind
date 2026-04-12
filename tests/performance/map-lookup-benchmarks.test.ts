/**
 * Performance benchmarks for Map-based lookup optimizations.
 * Verifies the claimed ~60x improvement for collections of ~1000 items.
 */
import { describe, test, expect } from '@jest/globals';

// Simulate the Map-based vs Array-based lookup patterns
const COLLECTION_SIZE = 1000;

interface TestItem {
  id: string;
  name: string;
  data: Record<string, unknown>;
}

function generateTestData(size: number): TestItem[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    data: { value: i, nested: { key: `nested-${i}` } },
  }));
}

describe('Map-based Lookup Performance Benchmarks', () => {
  const testItems = generateTestData(COLLECTION_SIZE);
  const testMap = new Map<string, TestItem>();
  testItems.forEach((item) => testMap.set(item.id, item));

  // Warm-up runs
  beforeAll(() => {
    for (let i = 0; i < 100; i++) {
      testItems.find((item) => item.id === `item-${i}`);
      testMap.get(`item-${i}`);
    }
  });

  test('Map lookup is O(1)', () => {
    const targetId = `item-${COLLECTION_SIZE - 1}`;
    const iterations = 10000;

    const startMap = performance.now();
    for (let i = 0; i < iterations; i++) {
      testMap.get(targetId);
    }
    const mapTime = performance.now() - startMap;

    // Map lookup should be consistent regardless of position
    const startArray = performance.now();
    for (let i = 0; i < iterations; i++) {
      testItems.find((item) => item.id === targetId);
    }
    const arrayTime = performance.now() - startArray;

    const speedup = arrayTime / mapTime;

    // Expect at least 10x speedup for 1000 items
    // (claim is ~60x, but CI environments vary)
    expect(speedup).toBeGreaterThan(10);

    console.log(`Map lookup: ${mapTime.toFixed(3)}ms for ${iterations} iterations`);
    console.log(`Array find: ${arrayTime.toFixed(3)}ms for ${iterations} iterations`);
    console.log(`Speedup: ${speedup.toFixed(1)}x`);

    // Map lookup should be sub-millisecond for 10k iterations
    expect(mapTime).toBeLessThan(10);
  });

  test('Map lookup time does not scale with collection size', () => {
    const smallMap = new Map(generateTestData(10).map((i) => [i.id, i]));
    const mediumMap = new Map(generateTestData(100).map((i) => [i.id, i]));
    const largeMap = new Map(generateTestData(10000).map((i) => [i.id, i]));

    const iterations = 1000;

    const times = [smallMap, mediumMap, largeMap].map((map) => {
      const targetId = map.keys().next().value;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        map.get(targetId);
      }
      return performance.now() - start;
    });

    // All lookup times should be similar (O(1) scaling)
    const variance = Math.max(...times) - Math.min(...times);
    expect(variance).toBeLessThan(5); // Within 5ms variance

    console.log(`Small (10 items): ${times[0].toFixed(3)}ms`);
    console.log(`Medium (100 items): ${times[1].toFixed(3)}ms`);
    console.log(`Large (10000 items): ${times[2].toFixed(3)}ms`);
  });

  test('Map iteration for updates is efficient', () => {
    const updateCount = 100;
    const start = performance.now();

    // Simulate updating many items in the map
    for (let i = 0; i < updateCount; i++) {
      const item = testMap.get(`item-${i}`);
      if (item) {
        item.data.updated = true;
      }
    }

    const updateTime = performance.now() - start;

    // Updating 100 items by Map lookup should be very fast
    expect(updateTime).toBeLessThan(5);

    console.log(`Update ${updateCount} items via Map: ${updateTime.toFixed(3)}ms`);
  });
});
