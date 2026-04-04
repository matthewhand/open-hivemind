
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '../DaisyUI/Alert';
import Button from '../DaisyUI/Button';
import Divider from '../DaisyUI/Divider';
import { SkeletonList } from '../DaisyUI/Skeleton';
import Select from '../DaisyUI/Select';
import FormField from '../DaisyUI/FormField';
import { Bot, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import Debug from 'debug';
import { useSavedStamp } from '../../contexts/SavedStampContext';
const debug = Debug('app:client:components:Settings:SettingsLLM');

const llmSettingsSchema = z.object({
    defaultLlm: z.string(),
});

type LLMConfig = z.infer<typeof llmSettingsSchema>;

const defaultValues: LLMConfig = {
    defaultLlm: '',
};

const SettingsLLM: React.FC = () => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<LLMConfig>({
        resolver: zodResolver(llmSettingsSchema),
        defaultValues,
    });

    const [providers, setProviders] = useState<Array<{ value: string; label: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
    const { showStamp } = useSavedStamp();

    const fetchSettingsAndProviders = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch global config to get the default LLM
            const configRes = await fetch('/api/config/global');
            const configData = await configRes.json();
            const rawConfig = configData;
            const llmData = rawConfig?.llm?.values ?? rawConfig;

            const currentDefault = llmData.LLM_PROVIDER || '';
            reset({ defaultLlm: currentDefault });

            // Fetch available LLM providers from the API
            const providersRes = await fetch('/api/admin/llm-providers');
            const providersData = await providersRes.json();
            const availableProviders = Array.isArray(providersData?.providers) ? providersData.providers : (Array.isArray(providersData) ? providersData : []);
            const options = availableProviders.map((p: any) => ({
                value: p.key,
                label: p.label,
            }));
            setProviders(options);

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
        setIsSaving(true);
        try {
            await fetch('/api/config/global', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ llm: { LLM_PROVIDER: values.defaultLlm } }),
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

                <div className="max-w-md mb-4">
                    <FormField label="Default LLM" error={errors.defaultLlm} hint="Select an LLM from your configured providers to act as the default engine.">
                        <Select
                            {...register('defaultLlm')}
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

                <Divider />

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
                    type="submit"
                    variant="primary"
                    loading={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </form>
    );
};

export default SettingsLLM;
