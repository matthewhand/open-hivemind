/**
 * DemoModeBanner - Shows a banner when the app is running in demo mode
 */

import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface DemoStatus {
    isDemoMode: boolean;
    botCount: number;
    conversationCount: number;
    messageCount: number;
    isSimulationRunning?: boolean;
    simulationStartTime?: number;
    message?: string;
}

const DemoModeBanner: React.FC = () => {
    const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkDemoMode = async () => {
            try {
                const res = await apiService.get('/api/demo/status') as
                    | DemoStatus
                    | { success?: boolean; data?: DemoStatus };
                // Unwrap ApiResponse envelope when present.
                const data =
                    res && typeof res === 'object' && 'data' in res && (res as { data?: DemoStatus }).data
                        ? (res as { data: DemoStatus }).data
                        : (res as DemoStatus);
                setDemoStatus(data);
            } catch (error) {
                console.debug('Could not check demo mode status:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkDemoMode();

        // Check every 30 seconds
        const interval = setInterval(checkDemoMode, 30000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading || !demoStatus || !demoStatus.isDemoMode || isDismissed) {
        return null;
    }

    return (
        <div
            className="bg-primary text-primary-content px-4 py-3 relative"
            data-testid="demo-mode-banner"
            role="status"
        >
            <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                    <span className="text-2xl" aria-hidden="true">🎭</span>
                    <div>
                        <span className="font-semibold">Demo Mode Active</span>
                        <span className="ml-2 opacity-80">
                            — Experience the platform without configuration!
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="text-sm opacity-80 hidden sm:block">
                        <span className="mr-3">🤖 {demoStatus.botCount} Demo Bots</span>
                        <span className="mr-3">💬 {demoStatus.conversationCount} Conversations</span>
                        {demoStatus.isSimulationRunning && (
                            <span className="mr-3 text-success">
                                📊 Live Simulation
                                <span className="inline-block w-2 h-2 bg-success rounded-full ml-1 animate-pulse"></span>
                            </span>
                        )}
                    </div>

                    <a
                        href="/onboarding"
                        className="btn btn-sm btn-secondary text-secondary-content font-semibold"
                    >
                        Get Started
                    </a>

                    <button
                        onClick={() => setIsDismissed(true)}
                        className="opacity-80 hover:opacity-100 transition-opacity"
                        aria-label="Dismiss banner"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="container mx-auto mt-2 text-sm opacity-80">
                💡 Configure your API keys in the{' '}
                <a href="/admin/settings" className="underline hover:opacity-100">
                    Settings
                </a>
                {' '}to enable production mode with real AI responses.
                {demoStatus.isSimulationRunning && (
                    <span className="ml-4">
                        🎯 Check the{' '}
                        <a href="/admin/overview?tab=monitoring" className="underline hover:opacity-100">
                            Monitoring Dashboard
                        </a>
                        {' '}to see live simulated activity!
                    </span>
                )}
            </div>
        </div>
    );
};

export default DemoModeBanner;
