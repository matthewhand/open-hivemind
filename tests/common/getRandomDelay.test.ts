import { getRandomDelay } from '../../src/common/getRandomDelay';
import Debug from 'debug';

const debug = Debug('app:getRandomDelay.test');

describe('getRandomDelay', () => {
    describe('basic functionality', () => {
        test('should return a number within the specified range', () => {
            const min = 100;
            const max = 200;
            const delay = getRandomDelay(min, max);
            expect(typeof delay).toBe('number');
            expect(delay).toBeGreaterThanOrEqual(min);
            expect(delay).toBeLessThanOrEqual(max);
        });

        test('should handle min and max being equal', () => {
            const min = 150;
            const max = 150;
            const delay = getRandomDelay(min, max);
            expect(delay).toBe(min);
        });

        test('should handle min and max as 0', () => {
            const delay = getRandomDelay(0, 0);
            expect(delay).toBe(0);
        });
    });

    describe('error handling', () => {
        test('should return 0 if min is greater than max', () => {
            const min = 300;
            const max = 200;
            const delay = getRandomDelay(min, max);
            expect(delay).toBe(0);
        });

        test('should return 0 if min or max is negative', () => {
            const negativeCases = [
                { min: -100, max: 200 },
                { min: 100, max: -200 },
                { min: -100, max: -200 },
            ];

            negativeCases.forEach(({ min, max }) => {
                const delay = getRandomDelay(min, max);
                expect(delay).toBe(0);
            });
        });

        test('should handle non-integer values', () => {
            const delay1 = getRandomDelay(100.5, 200.7);
            expect(delay1).toBeGreaterThanOrEqual(100.5);
            expect(delay1).toBeLessThanOrEqual(200.7);

            const delay2 = getRandomDelay(0.1, 0.9);
            expect(delay2).toBeGreaterThanOrEqual(0.1);
            expect(delay2).toBeLessThanOrEqual(0.9);
        });

        test('should handle very large numbers', () => {
            const min = 1000000;
            const max = 2000000;
            const delay = getRandomDelay(min, max);
            expect(delay).toBeGreaterThanOrEqual(min);
            expect(delay).toBeLessThanOrEqual(max);
        });
    });

    describe('randomness validation', () => {
        test('should generate different values on multiple calls', () => {
            const min = 1;
            const max = 1000;
            const results = new Set();
            
            for (let i = 0; i < 50; i++) {
                results.add(getRandomDelay(min, max));
            }
            
            // Should have generated multiple different values
            expect(results.size).toBeGreaterThan(10);
        });

        test('should have reasonable distribution across range', () => {
            const min = 0;
            const max = 100;
            const samples = 1000;
            const results: number[] = [];
            
            for (let i = 0; i < samples; i++) {
                results.push(getRandomDelay(min, max));
            }
            
            const average = results.reduce((sum, val) => sum + val, 0) / samples;
            const expectedAverage = (min + max) / 2;
            
            // Average should be reasonably close to expected (within 10%)
            expect(Math.abs(average - expectedAverage)).toBeLessThan(expectedAverage * 0.1);
            
            // Should have values in both lower and upper halves
            const lowerHalf = results.filter(val => val < expectedAverage).length;
            const upperHalf = results.filter(val => val >= expectedAverage).length;
            
            expect(lowerHalf).toBeGreaterThan(samples * 0.3);
            expect(upperHalf).toBeGreaterThan(samples * 0.3);
        });
    });

    describe('edge cases', () => {
        test('should handle very small ranges', () => {
            const delay = getRandomDelay(1, 2);
            expect(delay).toBeGreaterThanOrEqual(1);
            expect(delay).toBeLessThanOrEqual(2);
        });

        test('should handle zero as minimum', () => {
            const delay = getRandomDelay(0, 100);
            expect(delay).toBeGreaterThanOrEqual(0);
            expect(delay).toBeLessThanOrEqual(100);
        });

        test('should be performant for multiple calls', () => {
            const startTime = Date.now();
            
            for (let i = 0; i < 10000; i++) {
                getRandomDelay(1, 1000);
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete 10k calls in reasonable time (< 100ms)
            expect(duration).toBeLessThan(100);
        });
    });
});