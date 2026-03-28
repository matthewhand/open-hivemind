sed -i 's/): BehaviorPattern\[\] {/): Promise<BehaviorPattern[]> {/g' src/services/AnalyticsService.ts
sed -i 's/): UserSegment\[\] {/): Promise<UserSegment[]> {/g' src/services/AnalyticsService.ts
