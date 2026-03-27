import React, { useState, useEffect } from 'react';
import { apiService, ActivityEvent } from '../../services/api';
import DistributedTraceWaterfall, { TraceSpan } from './DistributedTraceWaterfall';
import { Alert } from '../DaisyUI/Alert';

export const BotActivityWaterfallMonitor: React.FC = () => {
    const [spans, setSpans] = useState<TraceSpan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [traceId, setTraceId] = useState<string>('');

    useEffect(() => {
        let mounted = true;

        const fetchActivity = async () => {
            try {
                setLoading(true);
                const data = await apiService.getActivity();

                if (!mounted) return;

                const events = data.events || [];
                if (events.length === 0) {
                    setSpans([]);
                    return;
                }

                const newSpans: TraceSpan[] = [];
                let minTime = Infinity;

                events.forEach(e => {
                    const t = new Date(e.timestamp).getTime();
                    if (t < minTime) minTime = t;
                });

                const channels = new Set<string>();
                const bots = new Set<string>();

                events.forEach(event => {
                    const channelId = `channel-${event.channelId || 'global'}`;
                    const botId = `bot-${event.channelId || 'global'}-${event.botName}`;

                    if (!channels.has(channelId)) {
                        newSpans.push({
                            id: channelId,
                            parentId: null,
                            name: `Channel: ${event.channelId || 'Global'}`,
                            service: event.provider || 'system',
                            startTime: minTime,
                            duration: 1000, // Will be updated later
                            status: 'success'
                        });
                        channels.add(channelId);
                    }

                    if (!bots.has(botId)) {
                        newSpans.push({
                            id: botId,
                            parentId: channelId,
                            name: `Bot: ${event.botName}`,
                            service: event.llmProvider || 'bot',
                            startTime: minTime,
                            duration: 1000, // Will be updated later
                            status: 'success'
                        });
                        bots.add(botId);
                    }

                    const eventTime = new Date(event.timestamp).getTime();
                    // Fallback to 100ms if no processing time recorded, just so it's visible on the waterfall
                    const processingTimeMs = event.processingTime || 100;

                    newSpans.push({
                        id: event.id,
                        parentId: botId,
                        name: `${event.messageType === 'incoming' ? 'Received' : 'Sent'} Message`,
                        service: 'message',
                        startTime: eventTime,
                        duration: processingTimeMs,
                        status: event.status === 'timeout' ? 'warning' : event.status,
                        tags: {
                            botName: event.botName,
                            provider: event.provider,
                            llmProvider: event.llmProvider,
                            userId: event.userId,
                            contentLength: String(event.contentLength)
                        },
                        logs: event.errorMessage ? [`Error: ${event.errorMessage}`] : undefined
                    });
                });

                // Update container durations to bound all children
                const maxTime = newSpans.reduce(
                    (max, s) => s.parentId ? Math.max(max, s.startTime + s.duration) : max,
                    -Infinity
                );
                const overallDuration = Math.max(maxTime - minTime, 1000);

                newSpans.forEach(span => {
                    if (!span.parentId || span.parentId.startsWith('channel-')) {
                        span.duration = overallDuration;
                    }
                });

                setTraceId(`bot-activity-${Date.now().toString(36)}`);
                setSpans(newSpans);
                setError(null);
            } catch (err: any) {
                if (mounted) setError(err.message || 'Failed to load activity data');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchActivity();
        return () => { mounted = false; };
    }, []);

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><span className="loading loading-spinner loading-lg text-primary" aria-hidden="true"></span></div>;
    }

    if (error) {
        return <Alert variant="error" className="m-4">{error}</Alert>;
    }

    return (
        <DistributedTraceWaterfall
            traceId={traceId}
            spans={spans}
            className="h-[600px] shadow-lg rounded-xl"
        />
    );
};

export default BotActivityWaterfallMonitor;
