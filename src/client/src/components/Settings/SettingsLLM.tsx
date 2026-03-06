/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from '../DaisyUI/Alert';
import Button from '../DaisyUI/Button';
import Select from '../DaisyUI/Select';

import { Bot, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';

interface LLMConfig {
    defaultLlm: string;
}

const SettingsLLM: React.FC = () => {
    const [settings, setSettings] = useState<LLMConfig>({
        defaultLlm: '',
    });
    const [providers, setProviders] = useState<Array<{ value: string; label: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

    const fetchSettingsAndProviders = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch global config to get the default LLM
            const configRes = await apiService.get('/api/config/global');
            const rawConfig = configRes || {};
            const llmData = rawConfig?.llm?.values ?? rawConfig;

            const currentDefault = llmData.LLM_PROVIDER || '';
            setSettings({ defaultLlm: currentDefault });

            // Fetch available LLM providers from the API
            const providersRes = await apiService.get('/api/admin/llm-providers');
            const availableProviders = providersRes?.providers || [];
            const options = availableProviders.map((p: any) => ({
                value: p.key,
                label: p.label,
            }));
            setProviders(options);

        } catch (err) {
            console.error('Failed to load LLM settings:', err);
            setAlert({
                type: 'warning',
                message: 'Could not load LLM settings or providers. Using defaults.',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettingsAndProviders();
    }, [fetchSettingsAndProviders]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiService.put('/api/config/global', {
                llm: {
                    LLM_PROVIDER: settings.defaultLlm,
                },
            });

            setAlert({ type: 'success', message: 'LLM settings saved successfully!' });
            setTimeout(() => setAlert(null), 5000);
        } catch (err) {
            console.error('Save failed:', err);
            setAlert({
                type: 'error',
                message: 'Failed to save LLM settings. Please try again.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                    <h5 className="text-lg font-bold">LLM Configuration</h5>
                    <p className="text-sm text-base-content/70">Configure the default Large Language Model for AI actions</p>
                </div>
            </div>

            {alert && (
                <Alert
                    status={alert.type === 'success' ? 'success' : alert.type === 'warning' ? 'warning' : 'error'}
                    message={alert.message}
                    onClose={() => setAlert(null)}
                />
            )}

            <div className="card bg-base-200/50 p-4">
                <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    Natural Language Actions
                </h6>

                <div className="form-control mb-4 max-w-md">
                    <label className="label">
                        <span className="label-text font-medium">Default LLM</span>
                        <span className="label-text-alt text-base-content/60">Used for features like AI summary</span>
                    </label>
                    <Select
                        value={settings.defaultLlm}
                        onChange={(e) => setSettings({ defaultLlm: e.target.value })}
                        className="w-full"
                    >
                        <option value="">None selected</option>
                        {providers.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </Select>
                    <label className="label">
                        <span className="label-text-alt text-base-content/60">
                            Select an LLM from your configured providers to act as the default engine.
                        </span>
                    </label>
                </div>

                <div className="divider"></div>

                <div className="flex justify-between items-center text-sm">
                    <span className="text-base-content/70">Need to configure more providers?</span>
                    <Link to="/admin/providers/llm" className="btn btn-sm btn-ghost gap-2 text-primary">
                        <LinkIcon className="w-4 h-4" />
                        Go to LLM Providers
                    </Link>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="primary"
                    loading={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
};

export default SettingsLLM;
