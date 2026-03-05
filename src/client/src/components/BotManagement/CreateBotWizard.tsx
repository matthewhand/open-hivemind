import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Cpu, User, Shield, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import Input from '../DaisyUI/Input';

interface CreateBotWizardProps {
    onCancel: () => void;
    onSuccess: () => void;
    personas: any[];
    llmProfiles: any[];
    defaultLlmConfigured: boolean;
}

export const CreateBotWizard: React.FC<CreateBotWizardProps> = ({
    onCancel,
    onSuccess,
    personas,
    llmProfiles,
    defaultLlmConfigured,
}) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [guardProfiles, setGuardProfiles] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        messageProvider: 'discord',
        llmProvider: '',
        persona: 'default',
        mcpGuardProfile: '',
        guards: {
            accessControl: false,
            rateLimit: false,
            contentFilter: false,
        }
    });

    useEffect(() => {
        const fetchGuardProfiles = async () => {
            try {
                const response = await fetch('/api/admin/guard-profiles');
                if (response.ok) {
                    const data = await response.json();
                    setGuardProfiles(data.data || []);
                }
            } catch (e) {
                console.error('Failed to fetch guard profiles', e);
            }
        };
        fetchGuardProfiles();
    }, []);

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

    const handleNext = () => setStep(s => Math.min(s + 1, 4));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

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

            const response = await fetch('/api/bots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create bot');
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create bot');
        } finally {
            setLoading(false);
        }
    };

    const isStepValid = () => {
        if (step === 1) return formData.name.trim().length > 0 && formData.messageProvider;
        return true;
    };

    return (
        <div className="flex flex-col h-full max-h-[70vh]">
            {/* Steps Indicator */}
            <ul className="steps w-full mb-8">
                {steps.map(s => (
                    <li key={s.id} className={`step ${step >= s.id ? 'step-primary' : ''}`}>
                        {s.title}
                    </li>
                ))}
            </ul>

            {/* Error Alert */}
            {error && (
                <div className="alert alert-error mb-4">
                    <span>{error}</span>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-1">
                {step === 1 && (
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
                                aria-label="What does this bot do?"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text">Message Provider</span></label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.messageProvider}
                                    onChange={e => {
                                        if (e.target.value === '___manage___') {
                                            window.open('/admin/config', '_blank');
                                            return;
                                        }
                                        setFormData({ ...formData, messageProvider: e.target.value });
                                    }}
                                >
                                    <option value="discord">Discord</option>
                                    <option value="slack">Slack</option>
                                    <option value="mattermost">Mattermost</option>
                                    <option disabled>──────────</option>
                                    <option value="___manage___">Add / Manage Providers...</option>
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">LLM Provider {defaultLlmConfigured ? '(optional)' : <span className="text-error">*</span>}</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.llmProvider}
                                    onChange={e => {
                                        if (e.target.value === '___manage___') {
                                            window.open('/admin/config', '_blank');
                                            return;
                                        }
                                        setFormData({ ...formData, llmProvider: e.target.value });
                                    }}
                                >
                                    <option value="">{defaultLlmConfigured ? 'Use System Default' : 'Select Provider'}</option>
                                    {llmProfiles.map(p => (
                                        <option key={p.key} value={p.key}>{p.name} ({p.provider})</option>
                                    ))}
                                    <option disabled>──────────</option>
                                    <option value="___manage___">Add / Manage Providers...</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Select Persona</span></label>
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                                <label className={`label cursor-pointer border rounded-lg p-3 hover:bg-base-200 transition-colors ${formData.persona === 'default' ? 'border-primary bg-primary/5' : 'border-base-300'}`}>
                                    <span className="label-text flex flex-col">
                                        <span className="font-bold">Default Assistant</span>
                                        <span className="text-xs opacity-70">Helpful and polite general purpose assistant.</span>
                                    </span>
                                    <input
                                        type="radio"
                                        name="persona"
                                        className="radio radio-primary"
                                        checked={formData.persona === 'default'}
                                        onChange={() => setFormData({ ...formData, persona: 'default' })}
                                    />
                                </label>
                                {personas.filter(p => p.id !== 'default').map(p => (
                                    <label key={p.id} className={`label cursor-pointer border rounded-lg p-3 hover:bg-base-200 transition-colors ${formData.persona === p.id ? 'border-primary bg-primary/5' : 'border-base-300'}`}>
                                        <span className="label-text flex flex-col">
                                            <span className="font-bold">{p.name}</span>
                                            <span className="text-xs opacity-70">{p.description || 'Custom persona'}</span>
                                        </span>
                                        <input
                                            type="radio"
                                            name="persona"
                                            className="radio radio-primary"
                                            checked={formData.persona === p.id}
                                            onChange={() => setFormData({ ...formData, persona: p.id })}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <p className="text-sm opacity-70 mb-4">Configure safety and operational guardrails for your bot.</p>

                        <div className="form-control w-full mb-6">
                            <label className="label"><span className="label-text font-bold">Guard Profile</span></label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.mcpGuardProfile}
                                onChange={e => setFormData({ ...formData, mcpGuardProfile: e.target.value })}
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
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
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
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
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
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
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
                )}

                {step === 4 && (
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
                )}
            </div>

            {/* Footer Actions */}
            <div className="modal-action mt-6 flex justify-between">
                <button className="btn btn-ghost" onClick={step === 1 ? onCancel : handleBack} disabled={loading}>
                    {step === 1 ? 'Cancel' : <><ArrowLeft className="w-4 h-4" /> Back</>}
                </button>

                {step < 4 ? (
                    <button className="btn btn-primary" onClick={handleNext} disabled={!isStepValid()}>
                        Next <ArrowRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button className="btn btn-success btn-wide" onClick={handleSubmit} disabled={loading}>
                        {loading ? <span className="loading loading-spinner" /> : <><Check className="w-4 h-4" /> Finish & Create</>}
                    </button>
                )}
            </div>
        </div>
    );
};
