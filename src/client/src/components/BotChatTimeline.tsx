/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import Steps from './DaisyUI/Steps';

export const BotChatTimeline: React.FC = () => {
    return (
        <div className="w-full max-w-2xl bg-base-100 p-6 rounded-box shadow-md">
            <h3 className="text-lg font-bold mb-6">Interaction Timeline</h3>
            <Steps
                orientation="vertical"
                className="w-full"
                currentStep={2}
                steps={[
                    {
                        title: '10:42:15 AM — User',
                        description: '"Hello, can you check the server status?"',
                        status: 'completed',
                    },
                    {
                        title: '10:42:16 AM — System',
                        description: 'Message received and processed',
                        status: 'completed',
                    },
                    {
                        title: '10:42:18 AM — Assistant',
                        description: '"I\'m checking the system metrics now. Please hold on..."',
                        status: 'active',
                    },
                    {
                        title: 'Pending',
                        description: 'Awaiting response...',
                        status: 'pending',
                    },
                ]}
            />
        </div>
    );
};
