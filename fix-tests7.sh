git checkout src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i 's/result\.current\.isIdle/result.isIdle/g' src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i 's/result\.current\.reset()/result.reset()/g' src/client/src/hooks/__tests__/useInactivity.test.ts
sed -i 's/result\.current\.lastActive/result.lastActive/g' src/client/src/hooks/__tests__/useInactivity.test.ts
