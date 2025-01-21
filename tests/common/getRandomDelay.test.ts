import { getRandomDelay } from '../../src/common/getRandomDelay';
import Debug from 'debug';

const debug = Debug('app:getRandomDelay.test');

describe('getRandomDelay', () => {
    test('should return a number within the specified range', () => {
        const min = 100;
        const max = 200;
        const delay = getRandomDelay(min, max);
        expect(typeof delay).toBe('number');
        expect(delay).toBeGreaterThanOrEqual(min);
        expect(delay).toBeLessThanOrEqual(max);
    });

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