import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../utils/authFetch';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '../DaisyUI/Alert';
import Button from '../DaisyUI/Button';
import Card from '../DaisyUI/Card';
import Divider from '../DaisyUI/Divider';
import { SkeletonList } from '../DaisyUI/Skeleton';
import Select from '../DaisyUI/Select';
import FormField from '../DaisyUI/FormField';
import Toggle from '../DaisyUI/Toggle';
import { Bot, Link as LinkIcon, Cpu, MessageSquare, Layers, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Debug from 'debug';
import { useSavedStamp } from '../../contexts/SavedStampContext';
import { useToast } from '../DaisyUI/ToastNotification';
import { useDemoModeWarning } from '../../hooks/useDemoModeWarning';
import Tooltip from '../DaisyUI/Tooltip';
const debug = Debug('app:client:components:Settings:SettingsLLM');

const llmSettingsSchema = z.object({
    defaultLlm: z.string().optional(),
    defaultChatbotProfile: z.string().optional(),
    defaultEmbeddingProvider: z.string().optional(),
    perUseCaseEnabled: z.boolean().optional(),
    webuiIntelligenceProvider: z.string().optional(),
    taskProfiles: z.record(z.string()).optional()
});

type LLMConfig = z.infer<typeof llmSettingsSchema>;

const defaultValues: LLMConfig = {
    defaultLlm: '',
    defaultChatbotProfile: '',
    defaultEmbeddingProvider: '',
    perUseCaseEnabled: false,
    webuiIntelligenceProvider: '',
    taskProfiles: {}
};

const SettingsLLM: React.FC = () => {
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm<LLMConfig>({
        resolver: zodResolver(llmSettingsSchema),
        defaultValues,
    });

    const perUseCaseEnabled = useWatch({ control, name: 'perUseCaseEnabled' });

    const [providers, setProviders] = useState<Array<{ value: string; label: string }>>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
    const { showStamp } = useSavedStamp();
    const { addToast } = useToast();
    const warnIfDemo = useDemoModeWarning(addToast);

    const fetchSettingsAndProviders = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch global config to get the default LLM
            const configRes = await authFetch('/api/config/global');
            const configData = await configRes.json();
            const rawConfig = configData;
            const llmData = rawConfig?.llm?.values ?? rawConfig;
            const gs = rawConfig?._userSettings?.values || {};

            const currentDefault = llmData.LLM_PROVIDER || '';
            reset({ 
                defaultLlm: currentDefault,
                defaultChatbotProfile: gs.defaultChatbotProfile || '',
                defaultEmbeddingProvider: llmData.DEFAULT_EMBEDDING_PROVIDER || gs.defaultEmbeddingProvider || '',
                perUseCaseEnabled: !!gs.perUseCaseEnabled,
                webuiIntelligenceProvider: gs.webuiIntelligenceProvider || '',
                taskProfiles: gs.taskProfiles || {}
            });

            // Fetch available LLM providers from the API
            const providersRes = await authFetch('/api/admin/llm-providers');
            const providersData = await providersRes.json();
            const availableProviders = Array.isArray(providersData?.providers) ? providersData.providers : (Array.isArray(providersData) ? providersData : []);
            const options = availableProviders.map((p: any) => ({
                value: p.key,
                label: p.label,
            }));
            setProviders(options);

            // Fetch available LLM profiles from the API
            const profilesRes = await authFetch('/api/config/llm-profiles');
            const profilesData = await profilesRes.json();
            const availableProfiles = Array.isArray(profilesData?.profiles?.llm) ? profilesData.profiles.llm : (Array.isArray(profilesData) ? profilesData : []);
            setProfiles(availableProfiles);

        } catch (err) {
            debug('ERROR:', 'Failed to load LLM settings:', err);
            setAlert({
                type: 'warning',
                message: 'Could not load LLM settings or providers. Using defaults.',
            });
        } finally {
            setLoading(false);
        }
    }, [reset]);

    useEffect(() => {
        fetchSettingsAndProviders();
    }, [fetchSettingsAndProviders]);

    const onSubmit = async (values: LLMConfig) => {
        if (await warnIfDemo()) return;
        setIsSaving(true);
        try {
            // Clean up taskProfiles
            const cleanTaskProfiles = { ...values.taskProfiles };
            Object.keys(cleanTaskProfiles).forEach(k => {
                if (!cleanTaskProfiles[k]) delete cleanTaskProfiles[k];
            });

            await authFetch('/api/config/global', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    llm: { 
                        LLM_PROVIDER: values.defaultLlm || undefined,
                        DEFAULT_EMBEDDING_PROVIDER: values.defaultEmbeddingProvider || undefined
                    },
                    defaultChatbotProfile: values.defaultChatbotProfile || undefined,
                    perUseCaseEnabled: values.perUseCaseEnabled,
                    webuiIntelligenceProvider: values.webuiIntelligenceProvider || undefined,
                    taskProfiles: cleanTaskProfiles
                }),
            });

            setAlert({ type: 'success', message: 'LLM settings saved successfully!' });
            showStamp();
            setTimeout(() => setAlert(null), 5000);
        } catch (err) {
            debug('ERROR:', 'Save failed:', err);
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
            <div className="py-6 px-4">
                <SkeletonList items={4} />
            </div>
        );
    }

    const decodeHtmlEntities = (text: string) => text; // simple mock or import if needed
    const isChatCapable = (p: any) => true; // simplistic fallback
    const isEmbeddingCapable = (p: any) => true;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                    <h5 className="text-lg font-bold">LLM Configuration</h5>
                    <p className="text-sm text-base-content/70">Configure the default Large Language Model for AI actions</p>
                </div>
            </div>

            {alert && (
                <Alert
                    status={alert.type === "success" ? "success" : alert.type === "warning" ? "warning" : "error"}
                    message={alert.message}
                    onClose={() => setAlert(null)}
                />
            )}

            <Card className="bg-base-200/50 p-4">
                <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    System Default Fallbacks
                </h6>

                <div className="max-w-md mb-4">
                    <FormField label="Default LLM Plugin" hint="Select an LLM plugin from your configured providers to act as the global fallback engine.">
                        <Select
                            {...register("defaultLlm")}
                            className="w-full"
                        >
                            <option value="">None selected</option>
                            {providers.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                </div>
            </Card>

            <Card className="bg-base-200/50 p-4">
                <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Routing Defaults
                </h6>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField label="Default Chatbot Profile" hint="Profile used for all bot chat responses when per-use-case mode is off.">
                        <Select {...register("defaultChatbotProfile")} className="w-full">
                            <option value="">Use System Default</option>
                            {profiles.filter(isChatCapable).map((p) => (
                                <option key={p?.key} value={p?.key}>{decodeHtmlEntities(p?.name || "Unnamed")} ({decodeHtmlEntities(p?.provider || "Unknown")})</option>
                            ))}
                        </Select>
                    </FormField>

                    <FormField label="Default Embedding Provider" hint="Profile used by memory and semantic search features when embeddings are needed.">
                        <Select {...register("defaultEmbeddingProvider")} className="w-full">
                            <option value="">None Selected</option>
                            {profiles.filter(isEmbeddingCapable).map((p) => (
                                <option key={p?.key} value={p?.key}>{decodeHtmlEntities(p?.name || "Unnamed")} ({decodeHtmlEntities(p?.provider || "Unknown")})</option>
                            ))}
                        </Select>
                    </FormField>
                </div>

                <Divider />

                <div className="flex flex-row items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" />
                            Per-Use-Case LLM Profiles
                        </h3>
                        <p className="text-xs opacity-60 mt-0.5">
                            When enabled, assign different profiles to summarisation, moderation, and other tasks independently.
                        </p>
                    </div>
                    <Toggle
                        color="primary"
                        checked={!!perUseCaseEnabled}
                        {...register("perUseCaseEnabled")}
                    />
                </div>

                {perUseCaseEnabled && (
                    <div className="space-y-4 mt-4 bg-base-100 p-4 rounded-xl border border-base-300">
                        <h3 className="font-bold text-sm">Task Profile Assignments</h3>
                        <p className="text-xs opacity-60 mb-2">Assign a profile to each task. Tasks without a profile will use the default provider.</p>
                        
                        {(["semantic", "summary", "followup", "idle", "webui"] as const).map((task) => {
                            const taskHelp: Record<string, string> = {
                                semantic: "Evaluates message relevance and determines if the bot should respond based on context.",
                                summary: "Generates conversation summaries for context windows and memory management.",
                                followup: "Crafts natural follow-up responses when the bot stays engaged in a conversation.",
                                idle: "Generates unprompted messages when the bot decides to speak during quiet periods.",
                                webui: "Powers AI-assisted features in the admin dashboard (e.g. generating bot names, descriptions).",
                            };
                            
                            const fieldName = task === "webui" ? "webuiIntelligenceProvider" : "taskProfiles." + task;
                            
                            return (
                                <div key={task} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                                    <label className="w-40 text-sm capitalize flex items-center gap-1 font-medium">
                                        {task === "webui" ? "WebUI AI" : task}
                                        <Tooltip content={taskHelp[task]} position="right">
                                            <HelpCircle className="w-3.5 h-3.5 opacity-40 hover:opacity-80 cursor-help" />
                                        </Tooltip>
                                    </label>
                                    <Select
                                        {...register(fieldName as any)}
                                        className="flex-1"
                                        size="sm"
                                    >
                                        <option value="">— Default —</option>
                                        {(task === "webui" ? profiles.filter(isChatCapable) : profiles).map((p: any) => (
                                            <option key={p?.key} value={p?.key}>
                                                {decodeHtmlEntities(p?.name || "Unnamed")} {task === "webui" ? "(" + decodeHtmlEntities(p?.provider || "Unknown") + ")" : ""}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <div className="flex justify-between items-center pt-4">
                <Link to="/admin/providers/llm" className="btn btn-sm btn-ghost gap-2 text-primary">
                    <LinkIcon className="w-4 h-4" />
                    Manage LLM Profiles
                </Link>
                <Button
                    type="submit"
                    variant="primary"
                    loading={isSaving}
                >
                    {isSaving ? "Saving..." : "Save Settings"}
                </Button>
            </div>
        </form>
    );
};

export default SettingsLLM;
