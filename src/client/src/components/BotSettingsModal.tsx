import React, { useState } from 'react';
import {
    X, Save, MessageSquare, Cpu, Info, Edit2, Plus,
    Trash2, Copy, Shield, Eye, Settings
} from 'lucide-react';
import { Bot as ApiBot, Persona as ApiPersona } from '../services/api';

// Extended Bot type with UI-specific fields
interface BotConfig extends ApiBot {
    id: string; // BotsPage ensures ID is present
    envOverrides?: any;
    provider?: string; // Legacy/Aliased field
    status?: string;
}

// Define LLMProfile locally as it's not exported from API
interface LLMProfile {
    key: string;
    name: string;
    provider: string;
}

interface BotSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    bot: BotConfig;
    personas: ApiPersona[];
    llmProfiles: LLMProfile[];
    integrationOptions: { message: string[] };
    onUpdateConfig: (bot: BotConfig, key: string, value: any) => Promise<void>;
    onUpdatePersona: (bot: BotConfig, personaId: string) => Promise<void>;
    onClone: (bot: BotConfig) => void;
    onDelete: (bot: BotConfig) => void;
    onViewDetails: (bot: BotConfig) => void;
}

export const BotSettingsModal: React.FC<BotSettingsModalProps> = ({
    isOpen,
    onClose,
    bot,
    personas,
    llmProfiles,
    integrationOptions,
    onUpdateConfig,
    onUpdatePersona,
    onClone,
    onDelete,
    onViewDetails
}) => {
    if (!isOpen) return null;

    const isEnvProtected = bot.envOverrides && Object.keys(bot.envOverrides).length > 0;

    return (
        <dialog className="modal modal-open" onClose={onClose}>
            <div className="modal-box w-11/12 max-w-4xl bg-base-100">
                <form method="dialog">
                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
                </form>

                <div className="flex items-center gap-3 mb-6 border-b border-base-300 pb-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-2xl">{bot.name}</h3>
                        <p className="text-sm opacity-60 font-mono">{bot.id}</p>
                    </div>
                    {isEnvProtected && (
                        <div className="badge badge-warning gap-1 ml-auto">
                            <Shield className="w-3 h-3" /> Env Protected
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: Configuration */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold opacity-50 uppercase tracking-wider flex items-center gap-2 border-b border-base-200 pb-2">
                            Core Configuration
                        </h4>

                        {/* Message Provider */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 opacity-70" /> Messenger
                                    {bot.envOverrides?.messageProvider && (
                                        <div className="tooltip tooltip-right" data-tip="Locked by environment variable">
                                            <Shield className="w-3 h-3 text-warning" />
                                        </div>
                                    )}
                                </span>
                                <span className="label-text-alt opacity-60">Communication channel</span>
                            </label>
                            <div className={`dropdown w-full ${bot.envOverrides?.messageProvider ? 'dropdown-disabled' : ''}`}>
                                <div tabIndex={0} role="button" className={`btn btn-outline border-base-300 w-full justify-between font-normal ${bot.envOverrides?.messageProvider ? 'btn-disabled opacity-50' : ''}`}>
                                    {(bot as any).messageProvider || bot.provider || 'Select...'} <Edit2 className="w-4 h-4 opacity-50" />
                                </div>
                                {!bot.envOverrides?.messageProvider && (
                                    <ul tabIndex={0} className="dropdown-content z-[10] menu p-2 shadow-lg bg-base-200 rounded-box w-full mb-2">
                                        {integrationOptions.message.map(opt => (
                                            <li key={opt}>
                                                <a onClick={() => { onUpdateConfig(bot, 'messageProvider', opt); (document.activeElement as HTMLElement)?.blur(); }} className={bot.provider === opt ? 'active' : ''}>
                                                    {opt}
                                                </a>
                                            </li>
                                        ))}
                                        <div className="divider my-1"></div>
                                        <li>
                                            <a href="/admin/integrations/message" target="_blank" className="flex gap-2 items-center text-primary">
                                                <Plus className="w-4 h-4" /> New Messenger
                                            </a>
                                        </li>
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* LLM Provider */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text flex items-center gap-2">
                                    <Cpu className="w-4 h-4 opacity-70" /> LLM Profile
                                    {bot.envOverrides?.llmProvider && (
                                        <div className="tooltip tooltip-right" data-tip="Locked by environment variable">
                                            <Shield className="w-3 h-3 text-warning" />
                                        </div>
                                    )}
                                </span>
                                <span className="label-text-alt opacity-60">Intelligence model</span>
                            </label>
                            <div className={`dropdown w-full ${bot.envOverrides?.llmProvider ? 'dropdown-disabled' : ''}`}>
                                <div tabIndex={0} role="button" className={`btn btn-outline border-base-300 w-full justify-between font-normal ${bot.envOverrides?.llmProvider ? 'btn-disabled opacity-50' : ''}`}>
                                    {bot.llmProvider ? (
                                        llmProfiles.find(p => p.key === bot.llmProvider)?.name || bot.llmProvider
                                    ) : <span className="opacity-50 italic">System Default</span>}
                                    <Edit2 className="w-4 h-4 opacity-50" />
                                </div>
                                {!bot.envOverrides?.llmProvider && (
                                    <ul tabIndex={0} className="dropdown-content z-[10] menu p-2 shadow-lg bg-base-200 rounded-box w-full max-h-60 overflow-y-auto">
                                        <li>
                                            <a onClick={() => { onUpdateConfig(bot, 'llmProvider', ''); (document.activeElement as HTMLElement)?.blur(); }} className={!bot.llmProvider ? 'active' : ''}>
                                                <span className="italic opacity-75">System Default</span>
                                            </a>
                                        </li>
                                        <div className="divider my-1"></div>
                                        {llmProfiles.map(profile => (
                                            <li key={profile.key}>
                                                <a onClick={() => { onUpdateConfig(bot, 'llmProvider', profile.key); (document.activeElement as HTMLElement)?.blur(); }} className={bot.llmProvider === profile.key ? 'active' : ''}>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span>{profile.name}</span>
                                                        <span className="text-[10px] opacity-50 uppercase">{profile.provider}</span>
                                                    </div>
                                                </a>
                                            </li>
                                        ))}
                                        <div className="divider my-1"></div>
                                        <li>
                                            <a href="/admin/integrations/llm" target="_blank" className="flex gap-2 items-center text-primary">
                                                <Plus className="w-4 h-4" /> New Profile
                                            </a>
                                        </li>
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Persona */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text flex items-center gap-2">
                                    <div className="avatar placeholder w-4 h-4">
                                        <div className="bg-neutral-focus text-neutral-content rounded-full w-4 text-[8px]">P</div>
                                    </div>
                                    Persona
                                    {bot.envOverrides?.persona && (
                                        <div className="tooltip tooltip-right" data-tip="Locked by environment variable">
                                            <Shield className="w-3 h-3 text-warning" />
                                        </div>
                                    )}
                                </span>
                                <span className="label-text-alt opacity-60">Personality & Instructions</span>
                            </label>
                            <div className={`dropdown w-full ${bot.envOverrides?.persona ? 'dropdown-disabled' : ''}`}>
                                <div tabIndex={0} role="button" className={`btn btn-outline border-base-300 w-full justify-between font-normal ${bot.envOverrides?.persona ? 'btn-disabled opacity-50' : ''}`}>
                                    {personas.find(p => p.id === bot.persona)?.name || bot.persona || 'default'} <Edit2 className="w-4 h-4 opacity-50" />
                                </div>
                                {!bot.envOverrides?.persona && (
                                    <ul tabIndex={0} className="dropdown-content z-[10] menu p-2 shadow-lg bg-base-200 rounded-box w-full max-h-60 overflow-y-auto">
                                        {personas.map(p => (
                                            <li key={p.id}>
                                                <a onClick={() => { onUpdatePersona(bot, p.id); (document.activeElement as HTMLElement)?.blur(); }} className={bot.persona === p.id ? 'active' : ''}>
                                                    {p.name}
                                                </a>
                                            </li>
                                        ))}
                                        <div className="divider my-1"></div>
                                        <li>
                                            <a onClick={() => {
                                                const newP = prompt('Enter new persona name:');
                                                if (newP) { onUpdatePersona(bot, newP); }
                                            }}>
                                                <Plus className="w-4 h-4" /> New Persona
                                            </a>
                                        </li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Actions & Guards */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold opacity-50 uppercase tracking-wider flex items-center gap-2 border-b border-base-200 pb-2">
                            Behavior & Actions
                        </h4>

                        {/* Guards Panel */}
                        <div className="bg-base-200/50 rounded-lg p-4 space-y-3">
                            <h5 className="font-medium text-sm flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Active Guards
                            </h5>

                            <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-base-200 rounded-md transition-colors">
                                <span className="text-sm">Access Control</span>
                                <input type="checkbox" className="toggle toggle-sm toggle-success" disabled checked={!!bot.mcpGuard?.enabled} />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-base-200 rounded-md transition-colors opacity-50">
                                <span className="text-sm">Rate Limiter</span>
                                <input type="checkbox" className="toggle toggle-sm" disabled />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-base-200 rounded-md transition-colors opacity-50">
                                <span className="text-sm">Content Filter</span>
                                <input type="checkbox" className="toggle toggle-sm" disabled />
                            </label>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 pt-4">
                            <button className="btn btn-outline w-full justify-start gap-3" onClick={() => onViewDetails(bot)}>
                                <Eye className="w-4 h-4" /> View Logs & Details
                            </button>

                            <button className="btn btn-outline w-full justify-start gap-3" onClick={() => onClone(bot)}>
                                <Copy className="w-4 h-4" /> Clone Configuration
                            </button>

                            <div className={isEnvProtected ? 'tooltip tooltip-top w-full' : 'w-full'} data-tip="Cannot delete: Defined by environment variables">
                                <button
                                    className="btn btn-outline btn-error w-full justify-start gap-3"
                                    disabled={isEnvProtected}
                                    onClick={() => onDelete(bot)}
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Bot
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Close</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};
