## 2024-05-18 - Optimized N+1 Query in React Map

**Learning:**
Found an O(N^2) operation in React `.map()` logic where each iteration was doing a lookup inside another array using `.find()`. In large sets, this leads to significant unneeded CPU processing on the frontend.
**Action:**
Instead, iterate over the outer array first to build a Map where the keys are the IDs and the values are the objects. Use that map for O(1) lookups inside the subsequent array `.map()` iteration.

## 2025-05-18 - Optimized Filtering on Chronologically Ordered Arrays

**Learning:**
Found an O(N) array filtering operation (`.filter()`) on chronologically ordered message histories. Since the items are ordered by time and we want to drop items older than a specific cutoff window, evaluating every element via `.filter()` is unnecessary.
**Action:**
Instead, iterate from the beginning and use an early-exit loop combined with `.slice()` once the first valid item is found. This effectively drops the complexity from O(N) (checking every item) to O(K) where K is the number of older messages being dropped, significantly reducing CPU work on long histories.
