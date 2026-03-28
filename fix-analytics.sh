sed -i 's/public getBehaviorPatterns/public async getBehaviorPatterns/g' src/services/AnalyticsService.ts
sed -i 's/const events = this.activityLogger.getEvents(/const events = await this.activityLogger.getEvents(/g' src/services/AnalyticsService.ts
sed -i 's/public getUserSegments/public async getUserSegments/g' src/services/AnalyticsService.ts
sed -i 's/public getDashboardRecommendations/public async getDashboardRecommendations/g' src/services/AnalyticsService.ts
sed -i 's/const patterns = this.getBehaviorPatterns/const patterns = await this.getBehaviorPatterns/g' src/services/AnalyticsService.ts
sed -i 's/const segments = this.getUserSegments/const segments = await this.getUserSegments/g' src/services/AnalyticsService.ts
sed -i 's/public getAnalyticsStats/public async getAnalyticsStats/g' src/services/AnalyticsService.ts
sed -i 's/public getTimeSeriesData/public async getTimeSeriesData/g' src/services/AnalyticsService.ts
