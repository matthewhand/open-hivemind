import React from 'react';
import { Check, MessageSquare, Bot, User, Clock } from 'lucide-react';

export const BotChatTimeline: React.FC = () => {
    return (
        <div className="w-full max-w-2xl bg-base-100 p-6 rounded-box shadow-md">
            <h3 className="text-lg font-bold mb-6">Interaction Timeline</h3>
            <ul className="steps steps-vertical w-full">
                <li className="step step-primary">
                    <div className="flex flex-col text-left w-full ml-4 mb-6">
                        <div className="flex items-center gap-2 font-bold opacity-70 text-xs uppercase tracking-wider mb-1">
                            <Clock className="w-3 h-3" /> 10:42:15 AM
                        </div>
                        <div className="bg-base-200 p-3 rounded-lg rounded-tl-none border border-base-300 relative">
                            <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-base-300 border-l-[10px] border-l-transparent border-b-[0px] border-b-transparent"></div>
                            <p className="font-semibold text-sm mb-1 flex items-center gap-2"><User className="w-3 h-3" /> User</p>
                            <p className="text-sm">"Hello, can you check the server status?"</p>
                        </div>
                    </div>
                </li>
                <li className="step step-primary">
                    <div className="flex flex-col text-left w-full ml-4 mb-6">
                        <div className="flex items-center gap-2 font-bold opacity-70 text-xs uppercase tracking-wider mb-1">
                            <Clock className="w-3 h-3" /> 10:42:16 AM
                        </div>
                        <div className="alert alert-info py-2 px-3 text-sm">
                            <Check className="w-4 h-4" /> Message received and processed
                        </div>
                    </div>
                </li>
                <li className="step step-primary">
                    <div className="flex flex-col text-left w-full ml-4 mb-6">
                        <div className="flex items-center gap-2 font-bold opacity-70 text-xs uppercase tracking-wider mb-1">
                            <Clock className="w-3 h-3" /> 10:42:18 AM
                        </div>
                        <div className="bg-primary/10 p-3 rounded-lg rounded-tl-none border border-primary/20 relative">
                            <p className="font-semibold text-sm mb-1 flex items-center gap-2"><Bot className="w-3 h-3" /> Assistant</p>
                            <p className="text-sm">"I'm checking the system metrics now. Please hold on..."</p>
                        </div>
                        <div className="mt-2 text-xs opacity-50 font-mono">Thought process: Retrieve health metrics from API...</div>
                    </div>
                </li>
                <li className="step">
                    <div className="flex flex-col text-left w-full ml-4">
                        <div className="flex items-center gap-2 font-bold opacity-50 text-xs uppercase tracking-wider mb-1">
                            <Clock className="w-3 h-3" /> Pending
                        </div>
                        <div className="skeleton h-12 w-full rounded-lg"></div>
                    </div>
                </li>
            </ul>
        </div>
    );
};
