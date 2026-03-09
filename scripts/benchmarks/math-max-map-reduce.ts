import { performance } from 'perf_hooks';

// Setup data
const items = Array.from({ length: 100000 }, (_, i) => ({ value: i }));

// Benchmark 1: Math.max(...array.map())
const start1 = performance.now();
try {
  const max1 = Math.max(...items.map(item => item.value));
} catch (e) {
  console.log("Math.max(...items.map()) threw an error:", e.message);
}
const end1 = performance.now();

// Benchmark 2: array.reduce()
const start2 = performance.now();
const max2 = items.reduce((max, item) => Math.max(max, item.value), -Infinity);
const end2 = performance.now();

console.log(`Math.max(...array.map()): ${end1 - start1} ms`);
console.log(`array.reduce(): ${end2 - start2} ms`);
