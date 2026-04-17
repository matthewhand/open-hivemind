sed -i 's/vi\.advanceTimersByTime/act(() => vi.advanceTimersByTime/g' src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i "s/ByTime(1000)/ByTime(1000))/g" src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i "s/ByTime(timeoutMs)/ByTime(timeoutMs))/g" src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i "s/ByTime(3000)/ByTime(3000))/g" src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i "s/ByTime(1500)/ByTime(1500))/g" src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i "s/ByTime(500)/ByTime(500))/g" src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i "s/ByTime(2000)/ByTime(2000))/g" src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i "s/ByTime(600)/ByTime(600))/g" src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i 's/));;/\);/g' src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i 's/));/\);/g' src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i 's/act(() => act(() => vi.advanceTimersByTime/act(() => vi.advanceTimersByTime/g' src/client/src/hooks/__tests__/useInactivity.test.ts
