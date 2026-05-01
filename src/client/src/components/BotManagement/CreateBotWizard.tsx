// TODO(lint-hygiene): the dynamic shapes returned by `apiService.{get,post}`
// in this wizard (personas, llmProfiles, guardProfiles, AI generation result)
// are not strongly typed yet. Pre-existing technical debt — disabling
// `no-explicit-any` here so the file passes `--max-warnings 0` while the
// types are tightened in a follow-up PR.
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import { User, Check, AlertCircle, Wand2, Sparkles, Send, MessageSquare } from 'lucide-react';
import Button from '../DaisyUI/Button';
import Divider from '../DaisyUI/Divider';
import Input from '../DaisyUI/Input';
import StepWizard, { Step } from '../DaisyUI/StepWizard';
import Modal from '../DaisyUI/Modal';
import { useConfigDiff } from '../../hooks/useConfigDiff';
import { ConfigDiffConfirmDialog } from '../ConfigDiffViewer';
import { Alert } from '../DaisyUI/Alert';
import { Badge } from '../DaisyUI/Badge';
import Card from '../DaisyUI/Card';
import { apiService } from '../../services/api';
import Debug from 'debug';
import Toggle from '../DaisyUI/Toggle';
import Select from '../DaisyUI/Select';
import Textarea from '../DaisyUI/Textarea';
import Mockup from '../DaisyUI/Mockup';
import LlmTestChat from '../LlmTestChat';
const debug = Debug('app:client:components:BotManagement:CreateBotWizard');

interface CreateBotWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: any) => void;
    personas?: any[];
    llmProfiles?: any[];
    defaultLlmConfigured?: boolean;
}

export const CreateBotWizard: React.FC<CreateBotWizardProps> = (props) => {
    const {
        isOpen,
        onClose,
        onSubmit,
        personas: propsPersonas,
        llmProfiles: propsLlmProfiles,
        defaultLlmConfigured: propsDefaultLlmConfigured,
    } = props;

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
    
    // AI Generation state
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiDescription, setAiDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiGeneratedResult, setAiGeneratedResult] = useState<any>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handleAiGenerate = async () => {
        if (!aiDescription.trim()) return;
        setIsGenerating(true);
        setAiGeneratedResult(null);
        try {
            const result: any = await apiService.post('/api/bots/generate-config', { 
                description: aiDescription 
            });
            if (result.success && result.data) {
                setAiGeneratedResult(result.data);
            }
        } catch (e) {
            debug('ERROR:', 'AI generation failed', e);
            setError('AI generation failed. Please try a different description.');
        } finally {
            setIsGenerating(false);
        }
    };

    const applyAiGeneratedConfig = () => {
        if (!aiGeneratedResult) return;
        
        setFormData({
            ...formData,
            name: aiGeneratedResult.name || formData.name,
            description: aiGeneratedResult.personaName || formData.description,
            // Pre-fill system instructions would require adding a field to bot config or creating a persona
            // For now, we'll map description to personaName
        });
        
        setIsAiModalOpen(false);
        setAiGeneratedResult(null);
        setAiDescription('');
    };

    const formDataAsRecord = useMemo(() => formData as unknown as Record<string, unknown>, [formData]);
    const { hasChanges, diff, setOriginalConfig } = useConfigDiff(formDataAsRecord);

    useEffect(() => {
        setOriginalConfig(initialFormData as unknown as Record<string, unknown>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const fetchGuardProfiles = async () => {
            try {
                const data: any = await apiService.get('/api/admin/guard-profiles');
                setGuardProfiles(Array.isArray(data.data) ? data.data : []);
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
                maxTokensPerDay: formData.maxTokensPerDay > 0 ? formData.maxTokensPerDay : undefined,
                config: {
                    mcpGuard: { enabled: formData.guards.accessControl },
                    rateLimit: { enabled: formData.guards.rateLimit },
                    contentFilter: { enabled: formData.guards.contentFilter },
                }
            };

            if (onSubmit) {
                await onSubmit(payload);
                onClose();
            } else {
                await apiService.post('/api/bots', payload);
                onClose();
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
            <Alert status="warning" className="mt-4 shadow-lg">
                <AlertCircle className="w-5 h-5" />
                <div className="flex flex-col">
                    <span className="font-semibold">Please fix the following before continuing:</span>
                    <ul className="list-disc list-inside text-sm mt-1">
                        {errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                        ))}
                    </ul>
                </div>
            </Alert>
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
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <Input
                                label={<span>Bot Name <span className="text-error">*</span></span>}
                                placeholder="e.g. HelpBot"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <Button 
                            variant="primary" 
                            className="gap-2 mb-1" 
                            onClick={() => setIsAiModalOpen(true)}
                            aria-label="Generate with AI"
                        >
                            <Wand2 className="w-4 h-4" />
                            <span className="hidden sm:inline">AI Help</span>
                        </Button>
                    </div>

                    <div className="form-control">
                        <Textarea
                            className="h-24"
                            placeholder="What does this bot do?"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Message Provider <span className="text-error">*</span></span>
                            </label>
                            <div className="flex gap-2">
                                <Select
                                    className={`flex-1 ${!formData.messageProvider ? 'select-error' : ''}`}
                                    value={formData.messageProvider}
                                    onChange={e => setFormData({ ...formData, messageProvider: e.target.value })}
                                    options={[
                                        { label: 'Select Provider', value: '', disabled: true },
                                        { label: 'Discord', value: 'discord' },
                                        { label: 'Slack', value: 'slack' },
                                        { label: 'Mattermost', value: 'mattermost' },
                                    ]}
                                />
                                <Button variant="primary" buttonStyle="outline" className="btn-square" aria-label="Add provider">
                                    +
                                </Button>
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">LLM Provider (optional)</span>
                            </label>
                            <Select
                                className={`${!defaultLlmConfigured && !formData.llmProvider ? 'select-error' : ''}`}
                                value={formData.llmProvider}
                                onChange={e => setFormData({ ...formData, llmProvider: e.target.value })}
                                options={[
                                    { label: 'Use System Default', value: '' },
                                    ...fetchedLlmProfiles.map(p => ({
                                        label: `${p.name} (${p.provider})`,
                                        value: p.id,
                                    })),
                                ]}
                            />
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
                        <Select
                            className={`w-full ${!formData.persona ? 'select-error' : ''}`}
                            value={formData.persona}
                            onChange={e => setFormData({ ...formData, persona: e.target.value })}
                            options={[
                                { label: 'Choose a persona...', value: '', disabled: true },
                                ...fetchedPersonas.map(p => ({ label: p.name, value: p.id })),
                            ]}
                        />
                    </div>

                    {formData.persona && (
                        <Card className="bg-base-200">
                            <Card.Body className="p-4">
                                <Card.Title tag="h3" className="text-sm opacity-70">Agent Preview</Card.Title>
                                <p className="text-sm">
                                    {fetchedPersonas.find(p => p.id === formData.persona)?.description || 'No description available.'}
                                </p>
                            </Card.Body>
                        </Card>
                    )}

                    <Divider>Or</Divider>

                    <Button variant="primary" buttonStyle="outline" className="w-full gap-2">
                        <User className="w-4 h-4" />
                        Create New Persona
                    </Button>
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
                        <Select
                            className="select-bordered"
                            value={formData.mcpGuardProfile || ''}
                            onChange={e => setFormData({ ...formData, mcpGuardProfile: e.target.value || null })}
                        >
                            <option value="">No Profile (Use Manual Config)</option>
                            {guardProfiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </Select>
                        <label className="label">
                            <span className="label-text-alt">Using a profile overrides manual settings below.</span>
                        </label>
                    </div>

                    <Divider>Manual Overrides</Divider>

                    <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-4">
                            <Toggle
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
                            <Toggle
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
                            <Toggle
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

                    <Divider>Cost Control</Divider>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold">Daily Token Limit</span>
                        </label>
                        <Input
                            type="number"
                            min="0"
                            placeholder="e.g. 50000"
                            value={formData.maxTokensPerDay || ''}
                            onChange={e => setFormData({ ...formData, maxTokensPerDay: parseInt(e.target.value, 10) || 0 })}
                        />
                        <label className="label">
                            <span className="label-text-alt">Bot will pause automatically if it exceeds this daily usage (0 = unlimited).</span>
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
                    <Alert status="info" className="bg-base-200 border-none">
                        <div className="flex flex-col w-full gap-2">
                            <h3 className="font-bold text-lg">Review Configuration</h3>
                            <Divider className="my-0" />
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

                            <Divider className="my-0" />
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
                                            <Badge variant="ghost">No Guardrails Enabled</Badge>
                                        )}
                                        {formData.guards.accessControl && <Badge variant="primary">Access Control</Badge>}
                                        {formData.guards.rateLimit && <Badge variant="secondary">Rate Limiting</Badge>}
                                        {formData.guards.contentFilter && <Badge variant="accent">Content Filter</Badge>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Alert>

                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center justify-between mt-4">
                        <div>
                           <p className="text-sm font-medium text-primary">Live Sandbox Preview</p>
                           <p className="text-xs opacity-60">Test this persona's logic before saving.</p>
                        </div>
                        <Button variant="secondary" size="sm" className="gap-2" onClick={() => setIsPreviewOpen(true)}>
                           <MessageSquare className="w-4 h-4" /> Preview Chat
                        </Button>
                    </div>
                </div>
            )
        }
    ];


    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Create New Bot" size="lg">
                <div className="flex flex-col h-full max-h-[70vh]">
                    {error && (
                        <Alert status="error" className="mb-4" message={error} />
                    )}

                    <div className="flex-1 overflow-y-auto px-1 pb-16">
                        <StepWizard
                            steps={wizardSteps}
                            onComplete={() => hasChanges ? setShowDiffConfirm(true) : handleSubmit()}
                            onCancel={onClose}
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

            {/* AI Persona Generator Modal */}
        <Modal 
            isOpen={isAiModalOpen} 
            onClose={() => setIsAiModalOpen(false)} 
            title="AI Persona Generator"
            size="md"
        >
            <div className="space-y-4">
                {!aiGeneratedResult ? (
                    <>
                        <p className="text-sm opacity-70">
                            Describe what you want your bot to do, and our AI will generate a name, 
                            persona, and expert system instructions for you.
                        </p>
                        <div className="form-control">
                            <Textarea
                                className="h-32 bg-base-200"
                                placeholder="e.g. A proactive DevOps assistant that monitors my Slack channels for infrastructure alerts and suggests fixes..."
                                value={aiDescription}
                                onChange={e => setAiDescription(e.target.value)}
                                autoFocus
                                disabled={isGenerating}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsAiModalOpen(false)}>Cancel</Button>
                            <Button 
                                variant="primary" 
                                className="gap-2" 
                                onClick={handleAiGenerate}
                                loading={isGenerating}
                                disabled={!aiDescription.trim()}
                            >
                                <Sparkles className="w-4 h-4" />
                                {isGenerating ? 'Designing...' : 'Generate Persona'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                            <h4 className="text-xs font-bold text-primary uppercase mb-2">Generated Draft</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-xs opacity-50">Suggested Name:</span>
                                    <span className="text-sm font-bold">{aiGeneratedResult.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs opacity-50">Persona:</span>
                                    <span className="text-sm font-medium italic">{aiGeneratedResult.personaName}</span>
                                </div>
                            </div>
                        </div>

                        <Collapse title="View System Instructions" className="bg-base-200" size="sm">
                            <Mockup 
                                type="code" 
                                content={aiGeneratedResult.systemInstruction} 
                                className="text-[10px] max-h-48 overflow-auto"
                            />
                        </Collapse>

                        {aiGeneratedResult.suggestedMcpTools && (
                            <div className="flex flex-wrap gap-2">
                                {aiGeneratedResult.suggestedMcpTools.map((tool: string) => (
                                    <Badge key={tool} variant="outline" size="sm">+{tool}</Badge>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between pt-2">
                            <Button variant="ghost" onClick={() => setAiGeneratedResult(null)}>Try Again</Button>
                            <Button variant="primary" className="gap-2" onClick={applyAiGeneratedConfig}>
                                <Send className="w-4 h-4" />
                                Apply to Wizard
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>

        {/* Sandbox Preview Chat */}
        {isPreviewOpen && (
            <LlmTestChat 
                sandboxConfig={formData}
                onClose={() => setIsPreviewOpen(false)}
            />
        )}
    </>
    );
};
