import React, { useState, useEffect } from 'react';
import { Badge, Alert, Loading, Button, Modal } from '../DaisyUI';
import {
    CpuChipIcon,
    ArrowPathIcon,
    PencilIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline';

interface RedactedValue {
    isRedacted: boolean;
    redactedValue: string;
    hasValue: boolean;
}

interface BotConfig {
    name: string;
    messageProvider: string;
    llmProvider: string;
    llmProfile?: string;
    persona?: string;
    isActive: boolean;
    source: string;
    discord?: Record<string, unknown | RedactedValue>;
    slack?: Record<string, unknown | RedactedValue>;
    [key: string]: unknown;
}

interface BotListResponse {
    bots: BotConfig[];
    count: number;
    warnings: string[];
}

const BotListManager: React.FC = () => {
    const [bots, setBots] = useState<BotConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchBots();
    }, []);

    const fetchBots = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/config/bots');
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch bots');
            }
            const data: BotListResponse = await res.json();
            setBots(data.bots || []);
            setWarnings(data.warnings || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewBot = (bot: BotConfig) => {
        setSelectedBot(bot);
        setIsModalOpen(true);
    };

    const getProviderBadgeColor = (provider: string): string => {
        switch (provider) {
            case 'discord': return 'badge-primary';
            case 'slack': return 'badge-secondary';
            case 'mattermost': return 'badge-accent';
            default: return 'badge-ghost';
        }
    };

    const renderConfigValue = (key: string, value: unknown): React.ReactNode => {
        if (!value) return <span className="text-base-content/40">—</span>;

        if (typeof value === 'object' && value !== null) {
            const obj = value as Record<string, unknown>;
            if (obj.isRedacted) {
                return (
                    <span className="inline-flex items-center gap-1 text-warning">
                        <EyeSlashIcon className="w-4 h-4" />
                        <code className="text-xs">{(obj as RedactedValue).redactedValue}</code>
                    </span>
                );
            }
            return <code className="text-xs bg-base-200 px-1 rounded">{JSON.stringify(value)}</code>;
        }

        return <span>{String(value)}</span>;
    };

    if (loading) return <Loading />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Configured Bots</h2>
                    <p className="text-base-content/60">
                        View and manage all bots configured via environment variables or JSON files.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={fetchBots} startIcon={<ArrowPathIcon className="w-5 h-5" />}>
                        Refresh
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mb-4">
                    <Alert status="error" message={error} onClose={() => setError(null)} />
                </div>
            )}

            {warnings.length > 0 && (
                <div className="mb-4 space-y-2">
                    {warnings.map((warning, idx) => (
                        <Alert key={idx} status="warning" message={warning} />
                    ))}
                </div>
            )}

            {bots.length === 0 ? (
                <div className="text-center py-12">
                    <CpuChipIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                    <h3 className="text-lg font-semibold text-base-content/70">No Bots Found</h3>
                    <p className="text-base-content/50 mb-4">
                        Configure bots using <code>BOTS=bot1,bot2</code> and <code>BOTS_BOT1_*</code> environment variables,
                        or create JSON files in <code>config/bots/</code>.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Message Provider</th>
                                <th>LLM Provider</th>
                                <th>Persona</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bots.map(bot => (
                                <tr key={bot.name}>
                                    <td className="font-medium">{bot.name}</td>
                                    <td>
                                        <Badge className={getProviderBadgeColor(bot.messageProvider)}>
                                            {bot.messageProvider}
                                        </Badge>
                                    </td>
                                    <td>{bot.llmProvider || '—'}</td>
                                    <td>{bot.persona || 'default'}</td>
                                    <td>
                                        <Badge variant="ghost" className="text-xs">
                                            {bot.source === 'env' ? 'ENV' : 'JSON'}
                                        </Badge>
                                    </td>
                                    <td>
                                        {bot.isActive ? (
                                            <span className="inline-flex items-center gap-1 text-success">
                                                <CheckCircleIcon className="w-4 h-4" /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-error">
                                                <ExclamationCircleIcon className="w-4 h-4" /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleViewBot(bot)}
                                            startIcon={<PencilIcon className="w-4 h-4" />}
                                        >
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Bot: ${selectedBot?.name}`}
            >
                {selectedBot && (
                    <div className="space-y-4">
                        <div className="alert alert-info text-sm">
                            <EyeSlashIcon className="w-5 h-5" />
                            <span>Sensitive values (tokens, keys) are redacted for security.</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table table-sm w-full">
                                <tbody>
                                    {Object.entries(selectedBot)
                                        .filter(([key]) => !key.startsWith('_'))
                                        .map(([key, value]) => (
                                            <tr key={key}>
                                                <td className="font-mono text-sm font-medium w-1/3">{key}</td>
                                                <td>{renderConfigValue(key, value)}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-action">
                            <Button onClick={() => setIsModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default BotListManager;
