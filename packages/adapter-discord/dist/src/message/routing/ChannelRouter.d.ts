export type ChannelId = string;
export interface ChannelRouterMetadata {
    recentActivityScore?: number;
    [key: string]: unknown;
}
/**
 * Get configured bonus map from messageConfig.
 * Allowed bonus range is [0.0, 2.0].
 */
export declare function getChannelBonuses(): Record<string, number>;
/**
 * Get configured priority map from messageConfig.
 * Priorities are integers, lower means higher priority.
 */
export declare function getChannelPriorities(): Record<string, number>;
/**
 * Returns the bonus for a channelId. Defaults to 1.0 when not configured.
 */
export declare function getBonusForChannel(channelId: ChannelId): number;
/**
 * Returns the priority for a channelId. Defaults to 0 when not configured.
 * Lower value means higher priority.
 */
export declare function getPriorityForChannel(channelId: ChannelId): number;
/**
 * Compute score using the confirmed formula:
 * score = base(1.0) * bonus(channelId) / (1 + priority(channelId))
 */
export declare function computeScore(channelId: ChannelId, _metadata?: ChannelRouterMetadata): number;
/**
 * Picks the best channel from candidates.
 * Tie-breakers: highest bonus, then lexicographic channelId.
 */
export declare function pickBestChannel(candidates: ChannelId[], metadata?: ChannelRouterMetadata): ChannelId | null;
//# sourceMappingURL=ChannelRouter.d.ts.map