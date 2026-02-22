/**
 * DemoModeBanner - Shows a banner when the app is running in demo mode
 */

import React, { useState, useEffect } from 'react';

interface DemoStatus {
    isDemoMode: boolean;
    botCount: number;
    conversationCount: number;
    messageCount: number;
    message?: string;
}

const DemoModeBanner: React.FC = () => {
    const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkDemoMode = async () => {
            try {
                const response = await fetch('/api/demo/status');
                if (response.ok) {
                    const data = await response.json();
                    setDemoStatus(data);
                }
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
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 relative">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <span className="text-2xl">🎭</span>
                    <div>
                        <span className="font-semibold">Demo Mode Active</span>
                        <span className="ml-2 text-purple-200">
                            — Experience the platform without configuration!
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="text-sm text-purple-200">
                        <span className="mr-3">🤖 {demoStatus.botCount} Demo Bots</span>
                        <span className="mr-3">💬 {demoStatus.conversationCount} Conversations</span>
                    </div>

                    <button
                        onClick={() => setIsDismissed(true)}
                        className="text-purple-200 hover:text-white transition-colors"
                        aria-label="Dismiss banner"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="container mx-auto mt-2 text-sm text-purple-200">
                💡 Configure your API keys in the{' '}
                <a href="/#/settings" className="underline hover:text-white">
                    Settings
                </a>
                {' '}to enable production mode with real AI responses.
            </div>
        </div>
    );
};

export default DemoModeBanner;
