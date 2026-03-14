## 2024-05-18 - Optimized N+1 Query in React Map

**Learning:**
Found an O(N^2) operation in React `.map()` logic where each iteration was doing a lookup inside another array using `.find()`. In large sets, this leads to significant unneeded CPU processing on the frontend.
**Action:**
Instead, iterate over the outer array first to build a Map where the keys are the IDs and the values are the objects. Use that map for O(1) lookups inside the subsequent array `.map()` iteration.
