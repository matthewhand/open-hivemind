/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Button, Select, Input } from '../DaisyUI';
import { Bot, Link as LinkIcon, GitMerge } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface LLMConfig {
    defaultLlm: string;
    taskSemanticProvider: string;
    taskSemanticModel: string;
    taskSummaryProvider: string;
    taskSummaryModel: string;
    taskFollowupProvider: string;
    taskFollowupModel: string;
    taskIdleProvider: string;
    taskIdleModel: string;
}

const SettingsLLM: React.FC = () => {
    const [settings, setSettings] = useState<LLMConfig>({
        defaultLlm: '',
        taskSemanticProvider: '',
        taskSemanticModel: '',
        taskSummaryProvider: '',
        taskSummaryModel: '',
        taskFollowupProvider: '',
        taskFollowupModel: '',
        taskIdleProvider: '',
        taskIdleModel: '',
    });
    const [providers, setProviders] = useState<Array<{ value: string; label: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

    const fetchSettingsAndProviders = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch global config to get the default LLM
            const configRes = await axios.get('/api/config/global');
            const rawConfig = configRes.data;
            const llmData = rawConfig?.llm?.values ?? rawConfig;

            const llmTaskData = rawConfig?.llmTask?.values ?? {};

            const currentDefault = llmData.LLM_PROVIDER || '';
            setSettings({
                defaultLlm: currentDefault,
                taskSemanticProvider: llmTaskData.LLM_TASK_SEMANTIC_PROVIDER || '',
                taskSemanticModel: llmTaskData.LLM_TASK_SEMANTIC_MODEL || '',
                taskSummaryProvider: llmTaskData.LLM_TASK_SUMMARY_PROVIDER || '',
                taskSummaryModel: llmTaskData.LLM_TASK_SUMMARY_MODEL || '',
                taskFollowupProvider: llmTaskData.LLM_TASK_FOLLOWUP_PROVIDER || '',
                taskFollowupModel: llmTaskData.LLM_TASK_FOLLOWUP_MODEL || '',
                taskIdleProvider: llmTaskData.LLM_TASK_IDLE_PROVIDER || '',
                taskIdleModel: llmTaskData.LLM_TASK_IDLE_MODEL || '',
            });

            // Fetch available LLM providers from the API
            const providersRes = await axios.get('/api/admin/llm-providers');
            const availableProviders = providersRes.data.providers || [];
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
            await axios.put('/api/config/global', {
                llm: {
                    LLM_PROVIDER: settings.defaultLlm,
                },
                llmTask: {
                    LLM_TASK_SEMANTIC_PROVIDER: settings.taskSemanticProvider,
                    LLM_TASK_SEMANTIC_MODEL: settings.taskSemanticModel,
                    LLM_TASK_SUMMARY_PROVIDER: settings.taskSummaryProvider,
                    LLM_TASK_SUMMARY_MODEL: settings.taskSummaryModel,
                    LLM_TASK_FOLLOWUP_PROVIDER: settings.taskFollowupProvider,
                    LLM_TASK_FOLLOWUP_MODEL: settings.taskFollowupModel,
                    LLM_TASK_IDLE_PROVIDER: settings.taskIdleProvider,
                    LLM_TASK_IDLE_MODEL: settings.taskIdleModel,
                }
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

            <div className="card bg-base-200/50 p-4">
                <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
                    <GitMerge className="w-5 h-5 text-primary" />
                    Task Routing Overrides
                </h6>
                <p className="text-sm text-base-content/70 mb-6">
                    Optionally route specific background tasks to different LLM providers or models.
                    Leave blank to use the default LLM.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Semantic Relevance */}
                    <div className="bg-base-100 p-4 rounded-lg border border-base-300">
                        <span className="font-semibold text-sm mb-2 block">Semantic Relevance</span>
                        <div className="space-y-3">
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text text-xs">Provider Override</span></label>
                                <Select
                                    value={settings.taskSemanticProvider}
                                    onChange={(e) => setSettings({ ...settings, taskSemanticProvider: e.target.value })}
                                    className="select-sm w-full"
                                >
                                    <option value="">Use Default</option>
                                    {providers.map((p) => (
                                        <option key={`semantic-${p.value}`} value={p.value}>{p.label}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text text-xs">Model Override</span></label>
                                <Input
                                    value={settings.taskSemanticModel}
                                    onChange={(e) => setSettings({ ...settings, taskSemanticModel: e.target.value })}
                                    placeholder="e.g. gpt-3.5-turbo"
                                    className="input-sm w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summarization */}
                    <div className="bg-base-100 p-4 rounded-lg border border-base-300">
                        <span className="font-semibold text-sm mb-2 block">Summarization</span>
                        <div className="space-y-3">
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text text-xs">Provider Override</span></label>
                                <Select
                                    value={settings.taskSummaryProvider}
                                    onChange={(e) => setSettings({ ...settings, taskSummaryProvider: e.target.value })}
                                    className="select-sm w-full"
                                >
                                    <option value="">Use Default</option>
                                    {providers.map((p) => (
                                        <option key={`summary-${p.value}`} value={p.value}>{p.label}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text text-xs">Model Override</span></label>
                                <Input
                                    value={settings.taskSummaryModel}
                                    onChange={(e) => setSettings({ ...settings, taskSummaryModel: e.target.value })}
                                    placeholder="e.g. claude-3-haiku-20240307"
                                    className="input-sm w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Follow-up Generation */}
                    <div className="bg-base-100 p-4 rounded-lg border border-base-300">
                        <span className="font-semibold text-sm mb-2 block">Follow-up Generation</span>
                        <div className="space-y-3">
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text text-xs">Provider Override</span></label>
                                <Select
                                    value={settings.taskFollowupProvider}
                                    onChange={(e) => setSettings({ ...settings, taskFollowupProvider: e.target.value })}
                                    className="select-sm w-full"
                                >
                                    <option value="">Use Default</option>
                                    {providers.map((p) => (
                                        <option key={`followup-${p.value}`} value={p.value}>{p.label}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text text-xs">Model Override</span></label>
                                <Input
                                    value={settings.taskFollowupModel}
                                    onChange={(e) => setSettings({ ...settings, taskFollowupModel: e.target.value })}
                                    placeholder="e.g. gpt-4o-mini"
                                    className="input-sm w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Idle Response Generation */}
                    <div className="bg-base-100 p-4 rounded-lg border border-base-300">
                        <span className="font-semibold text-sm mb-2 block">Idle Response Generation</span>
                        <div className="space-y-3">
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text text-xs">Provider Override</span></label>
                                <Select
                                    value={settings.taskIdleProvider}
                                    onChange={(e) => setSettings({ ...settings, taskIdleProvider: e.target.value })}
                                    className="select-sm w-full"
                                >
                                    <option value="">Use Default</option>
                                    {providers.map((p) => (
                                        <option key={`idle-${p.value}`} value={p.value}>{p.label}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text text-xs">Model Override</span></label>
                                <Input
                                    value={settings.taskIdleModel}
                                    onChange={(e) => setSettings({ ...settings, taskIdleModel: e.target.value })}
                                    placeholder="e.g. mistral-large-latest"
                                    className="input-sm w-full"
                                />
                            </div>
                        </div>
                    </div>
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
