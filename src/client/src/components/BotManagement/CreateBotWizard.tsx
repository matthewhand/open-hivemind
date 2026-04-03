import React, { useState, useEffect, useMemo } from 'react';
import { Bot, MessageSquare, Cpu, User, Shield, Check, AlertCircle } from 'lucide-react';
import Input from '../DaisyUI/Input';
import StepWizard, { Step } from '../DaisyUI/StepWizard';
import Modal from '../DaisyUI/Modal';
import Radio from '../DaisyUI/Radio';
import { useConfigDiff } from '../../hooks/useConfigDiff';
import { ConfigDiffViewer, ConfigDiffConfirmDialog } from '../ConfigDiffViewer';
import { apiService } from '../../services/api';
import Debug from 'debug';
import Toggle from '../DaisyUI/Toggle';
const debug = Debug('app:client:components:BotManagement:CreateBotWizard');

interface CreateBotWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: any) => void;
    /** @deprecated Use isOpen/onClose/onSubmit instead */
    onCancel?: () => void;
    /** @deprecated Use isOpen/onClose/onSubmit instead */
    onSuccess?: () => void;
    personas?: any[];
    llmProfiles?: any[];
    defaultLlmConfigured?: boolean;
}

export const CreateBotWizard: React.FC<CreateBotWizardProps> = (props) => {
    const {
        isOpen,
        onClose,
        onSubmit,
        onCancel,
        onSuccess,
        personas: propsPersonas,
        llmProfiles: propsLlmProfiles,
        defaultLlmConfigured: propsDefaultLlmConfigured,
    } = props;

    const handleCancel = onCancel || onClose;
    const handleSuccess = onSuccess || onClose;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [guardProfiles, setGuardProfiles] = useState<any[]>([]);
    const [fetchedPersonas, setFetchedPersonas] = useState<any[]>([]);
    const [fetchedLlmProfiles, setFetchedLlmProfiles] = useState<any[]>([]);
    const [fetchedDefaultLlmConfigured, setFetchedDefaultLlmConfigured] = useState(true);

    const personas = propsPersonas ?? fetchedPersonas;
    const llmProfiles = propsLlmProfiles ?? fetchedLlmProfiles;
    const defaultLlmConfigured = propsDefaultLlmConfigured ?? fetchedDefaultLlmConfigured;

    const initialFormData = {
        name: '',
        description: '',
        messageProvider: '',
        llmProvider: '',
        persona: 'default',
        mcpGuardProfile: '',
        guards: {
            accessControl: false,
            rateLimit: false,
            contentFilter: false,
        }
    };

    const [formData, setFormData] = useState(initialFormData);
    const [showDiffConfirm, setShowDiffConfirm] = useState(false);

    const formDataAsRecord = useMemo(() => formData as unknown as Record<string, unknown>, [formData]);
    const { hasChanges, diff, setOriginalConfig, resetToOriginal } = useConfigDiff(formDataAsRecord);

    useEffect(() => {
        setOriginalConfig(initialFormData as unknown as Record<string, unknown>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUndoAll = () => {
        const original = resetToOriginal();
        setFormData(original as typeof formData);
    };

    useEffect(() => {
        const fetchGuardProfiles = async () => {
            try {
                const data: any = await apiService.get('/api/admin/guard-profiles');
                setGuardProfiles(data.data || []);
            } catch (e) {
                debug('ERROR:', 'Failed to fetch guard profiles', e);
            }
        };
        fetchGuardProfiles();

        // Fetch personas if not provided via props
        if (!propsPersonas) {
            const fetchPersonas = async () => {
                try {
                    const data: any = await apiService.getPersonas();
                    setFetchedPersonas(Array.isArray(data) ? data : []);
                } catch (e) {
                    debug('ERROR:', 'Failed to fetch personas', e);
                }
            };
            fetchPersonas();
        }

        // Fetch LLM profiles if not provided via props
        if (!propsLlmProfiles) {
            const fetchLlmProfiles = async () => {
                try {
                    const data: any = await apiService.getLlmProfiles();
                    setFetchedLlmProfiles(data?.llm || data?.profiles?.llm || data?.data || []);
                } catch (e) {
                    debug('ERROR:', 'Failed to fetch LLM profiles', e);
                }
            };
            fetchLlmProfiles();
        }

        // Fetch LLM status if not provided via props
        if (propsDefaultLlmConfigured === undefined) {
            const fetchLlmStatus = async () => {
                try {
                    const data: any = await apiService.get('/api/config/llm-status');
                    setFetchedDefaultLlmConfigured(data?.defaultConfigured ?? true);
                } catch (e) {
                    debug('ERROR:', 'Failed to fetch LLM status', e);
                }
            };
            fetchLlmStatus();
        }
    }, [propsPersonas, propsLlmProfiles, propsDefaultLlmConfigured]);

    const getPersonaName = () => {
        if (formData.persona === 'default') return 'Default Assistant';
        return personas.find(p => p.id === formData.persona)?.name || 'Custom';
    };

    const getLlmProviderName = () => {
        if (!formData.llmProvider) return 'System Default';
        return llmProfiles.find(p => p.key === formData.llmProvider)?.name || formData.llmProvider;
    };

    const getGuardProfileName = () => {
        if (!formData.mcpGuardProfile) return 'None (Manual Config)';
        return guardProfiles.find(p => p.id === formData.mcpGuardProfile)?.name || formData.mcpGuardProfile;
    };

    const steps = [
        { id: 1, title: 'Basics', icon: Bot },
        { id: 2, title: 'Persona', icon: User },
        { id: 3, title: 'Guardrails', icon: Shield },
        { id: 4, title: 'Review', icon: Check },
    ];


    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                messageProvider: formData.messageProvider,
                ...(formData.llmProvider ? { llmProvider: formData.llmProvider } : {}),
                persona: formData.persona,
                mcpGuardProfile: formData.mcpGuardProfile,
                config: {
                    mcpGuard: { enabled: formData.guards.accessControl },
                    rateLimit: { enabled: formData.guards.rateLimit },
                    contentFilter: { enabled: formData.guards.contentFilter },
                }
            };

            if (onSubmit) {
                await onSubmit(payload);
                handleSuccess();
            } else {
                await apiService.post('/api/bots', payload);
                handleSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create bot');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Enhanced step validation with specific field checks
     * Returns validation result with detailed error information
     */
    const validateStep = (stepNum: number): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (stepNum === 1) {
            const isNameValid = formData.name.trim().length > 0;
            const isMessageProviderValid = !!formData.messageProvider;
            const isLlmValid = defaultLlmConfigured || !!formData.llmProvider;

            if (!isNameValid) errors.push('Bot name is required');
            if (!isMessageProviderValid) errors.push('Message provider must be selected');
            if (!isLlmValid) errors.push('LLM provider is required (no system default configured)');

            return { valid: errors.length === 0, errors };
        }

        if (stepNum === 2) {
            const isPersonaValid = !!formData.persona;
            if (!isPersonaValid) errors.push('Please select a persona');
            return { valid: isPersonaValid, errors };
        }

        // Steps 3 and 4 are always valid (guardrails are optional)
        return { valid: true, errors: [] };
    };


    const renderValidationSummary = (stepNum: number) => {
        const { errors } = validateStep(stepNum);
        if (errors.length === 0) return null;
        return (
            <div className="alert alert-warning mt-4 shadow-lg">
                <AlertCircle className="w-5 h-5" />
                <div className="flex flex-col">
                    <span className="font-semibold">Please fix the following before continuing:</span>
                    <ul className="list-disc list-inside text-sm mt-1">
                        {errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    const wizardSteps: Step[] = [
        {
            id: 'basic-info',
            title: 'Basics',
            icon: '🤖',
            validation: () => validateStep(1).valid,
            content: (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <Input
                        label={<span>Bot Name <span className="text-error">*</span></span>}
                        placeholder="e.g. HelpBot"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        autoFocus
                    />

                    <div className="form-control">
                        <textarea
                            className="textarea textarea-bordered h-24"
                            placeholder="What does this bot do?"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Message Provider <span className="text-error">*</span></span>
                            </label>
                            <div className="flex gap-2">
                                <select
                                    className={`select select-bordered flex-1 ${!formData.messageProvider ? 'select-error' : ''}`}
                                    value={formData.messageProvider}
                                    onChange={e => setFormData({ ...formData, messageProvider: e.target.value })}
                                >
                                    <option value="" disabled>Select Provider</option>
                                    <option value="discord">Discord</option>
                                    <option value="slack">Slack</option>
                                    <option value="mattermost">Mattermost</option>
                                </select>
                                <button className="btn btn-square btn-outline">
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">LLM Provider (optional)</span>
                            </label>
                            <select
                                className={`select select-bordered w-full ${!defaultLlmConfigured && !formData.llmProvider ? 'select-error' : ''}`}
                                value={formData.llmProvider}
                                onChange={e => setFormData({ ...formData, llmProvider: e.target.value })}
                            >
                                <option value="">Use System Default</option>
                                {fetchedLlmProfiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.provider})</option>
                                ))}
                            </select>
                            <label className="label">
                                {defaultLlmConfigured && !formData.llmProvider ? (
                                    <span className="label-text-alt text-success flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Using system default configuration
                                    </span>
                                ) : !defaultLlmConfigured && !formData.llmProvider ? (
                                    <span className="label-text-alt text-error flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> System default not configured
                                    </span>
                                ) : (
                                    <span className="label-text-alt opacity-70">
                                        Overrides system default
                                    </span>
                                )}
                            </label>
                        </div>
                    </div>
                {renderValidationSummary(1)}
                </div>
            )
        },
        {
            id: 'persona',
            title: 'Persona',
            icon: '🎭',
            validation: () => validateStep(2).valid,
            content: (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Select Persona <span className="text-error">*</span></span>
                        </label>
                        <select
                            className={`select select-bordered w-full ${!formData.persona ? 'select-error' : ''}`}
                            value={formData.persona}
                            onChange={e => setFormData({ ...formData, persona: e.target.value })}
                        >
                            <option value="" disabled>Choose a persona...</option>
                            {fetchedPersonas.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {formData.persona && (
                        <div className="card bg-base-200">
                            <div className="card-body p-4">
                                <h3 className="card-title text-sm opacity-70">Agent Preview</h3>
                                <p className="text-sm">
                                    {fetchedPersonas.find(p => p.id === formData.persona)?.description || 'No description available.'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="divider">Or</div>

                    <button className="btn btn-outline w-full gap-2">
                        <User className="w-4 h-4" />
                        Create New Persona
                    </button>
                {renderValidationSummary(2)}
                </div>
            )
        },
        {
            id: 'guardrails',
            title: 'Guardrails',
            icon: '🛡️',
            optional: true,
            validation: () => validateStep(3).valid,
            content: (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold">Apply Guard Profile</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={formData.mcpGuardProfile || ''}
                            onChange={e => setFormData({ ...formData, mcpGuardProfile: e.target.value || null })}
                        >
                            <option value="">No Profile (Use Manual Config)</option>
                            {guardProfiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <label className="label">
                            <span className="label-text-alt">Using a profile overrides manual settings below.</span>
                        </label>
                    </div>

                    <div className="divider">Manual Overrides</div>

                    <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-4">
                            <Toggle
                                color="primary"
                                checked={formData.guards.accessControl}
                                onChange={e => setFormData({ ...formData, guards: { ...formData.guards, accessControl: e.target.checked } })}
                                disabled={!!formData.mcpGuardProfile}
                            />
                            <div className="flex flex-col">
                                <span className="label-text font-bold">Access Control</span>
                                <span className="label-text-alt">Limit interaction to specific users or roles.</span>
                            </div>
                        </label>
                    </div>

                    <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-4">
                            <Toggle
                                color="primary"
                                checked={formData.guards.rateLimit}
                                onChange={e => setFormData({ ...formData, guards: { ...formData.guards, rateLimit: e.target.checked } })}
                                disabled={!!formData.mcpGuardProfile}
                            />
                            <div className="flex flex-col">
                                <span className="label-text font-bold">Rate Limiting</span>
                                <span className="label-text-alt">Prevent spam by limiting message frequency.</span>
                            </div>
                        </label>
                    </div>

                    <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-4">
                            <Toggle
                                color="primary"
                                checked={formData.guards.contentFilter}
                                onChange={e => setFormData({ ...formData, guards: { ...formData.guards, contentFilter: e.target.checked } })}
                                disabled={!!formData.mcpGuardProfile}
                            />
                            <div className="flex flex-col">
                                <span className="label-text font-bold">Content Filtering</span>
                                <span className="label-text-alt">Block inappropriate or harmful content.</span>
                            </div>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'review',
            title: 'Review',
            icon: '✅',
            validation: () => validateStep(4).valid,
            content: (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="alert bg-base-200 border-none">
                        <div className="flex flex-col w-full gap-2">
                            <h3 className="font-bold text-lg">Review Configuration</h3>
                            <div className="divider my-0"></div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <span className="opacity-70">Bot Name:</span>
                                <span className="font-semibold">{formData.name}</span>

                                <span className="opacity-70">Description:</span>
                                <span className="font-semibold">{formData.description || 'None'}</span>

                                <span className="opacity-70">Platform:</span>
                                <span className="font-semibold capitalize">{formData.messageProvider}</span>

                                <span className="opacity-70">LLM Provider:</span>
                                <span className="font-semibold">{getLlmProviderName()}</span>

                                <span className="opacity-70">Persona:</span>
                                <span className="font-semibold">{getPersonaName()}</span>
                            </div>

                            <div className="divider my-0"></div>
                            <div className="flex flex-col gap-1">
                                <span className="opacity-70 text-sm">Guardrails:</span>
                                {formData.mcpGuardProfile ? (
                                    <div className="flex flex-col">
                                        <span className="font-semibold">Profile: {getGuardProfileName()}</span>
                                        <span className="text-xs opacity-70">Manual settings overridden.</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {!formData.guards.accessControl && !formData.guards.rateLimit && !formData.guards.contentFilter && (
                                            <span className="badge badge-ghost">No Guardrails Enabled</span>
                                        )}
                                        {formData.guards.accessControl && <span className="badge badge-primary">Access Control</span>}
                                        {formData.guards.rateLimit && <span className="badge badge-secondary">Rate Limiting</span>}
                                        {formData.guards.contentFilter && <span className="badge badge-accent">Content Filter</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];


    return (

        <Modal isOpen={isOpen} onClose={handleCancel} title="Create New Bot" size="lg">
            <div className="flex flex-col h-full max-h-[70vh]">
                {error && (
                    <div className="alert alert-error mb-4">
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-1 pb-16">
                    <StepWizard
                        steps={wizardSteps}
                        onComplete={() => hasChanges ? setShowDiffConfirm(true) : handleSubmit()}
                        onCancel={handleCancel}
                        showProgress={true}
                    />
                </div>
            </div>

        <ConfigDiffConfirmDialog
            isOpen={showDiffConfirm}
            diff={diff}
            onConfirm={() => { setShowDiffConfirm(false); handleSubmit(); }}
            onCancel={() => setShowDiffConfirm(false)}
            title="Confirm Bot Configuration"
            loading={loading}
        />
        </Modal>

    );
};
