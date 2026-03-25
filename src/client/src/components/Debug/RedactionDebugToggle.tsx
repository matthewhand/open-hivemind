import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { isAdminBypassEnabled, setAdminBypass, getRedactionConfig, configureRedaction } from '../../utils/redaction';

/**
 * Debug toggle component for authorized administrators to temporarily
 * reveal redacted PII data for troubleshooting purposes.
 *
 * This component should only be rendered for users with admin privileges.
 */
export const RedactionDebugToggle: React.FC = () => {
    const [bypassEnabled, setBypassEnabled] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [config, setConfig] = useState(getRedactionConfig());

    useEffect(() => {
        setBypassEnabled(isAdminBypassEnabled());
    }, []);

    const handleToggleBypass = () => {
        const newValue = !bypassEnabled;
        setAdminBypass(newValue);
        setBypassEnabled(newValue);
    };

    const handleLevelChange = (level: 'strict' | 'moderate' | 'minimal') => {
        configureRedaction({ level });
        setConfig(getRedactionConfig());
    };

    if (!config.allowAdminBypass) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!isVisible ? (
                <button
                    onClick={() => setIsVisible(true)}
                    className="btn btn-circle btn-sm btn-ghost opacity-50 hover:opacity-100"
                    title="Redaction Debug Controls"
                    aria-label="Redaction Debug Controls"
                >
                    <Shield className="w-4 h-4" />
                </button>
            ) : (
                <div className="card bg-base-300 shadow-xl border border-warning w-72">
                    <div className="card-body p-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="card-title text-sm flex items-center gap-2">
                                <Shield className="w-4 h-4 text-warning" />
                                PII Debug Controls
                            </h3>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="btn btn-ghost btn-xs btn-circle"
                                aria-label="Close debug panel"
                            >
                                ×
                            </button>
                        </div>

                        <div className="alert alert-warning text-xs py-2 mb-4">
                            <span>Warning: Revealing PII data for debugging only</span>
                        </div>

                        {/* Bypass Toggle */}
                        <div className="form-control mb-4">
                            <label className="label cursor-pointer">
                                <span className="label-text text-sm flex items-center gap-2">
                                    {bypassEnabled ? <Eye className="w-4 h-4 text-error" /> : <EyeOff className="w-4 h-4" />}
                                    Reveal PII Data
                                </span>
                                <input
                                    type="checkbox"
                                    className="toggle toggle-warning toggle-sm"
                                    checked={bypassEnabled}
                                    aria-label={bypassEnabled ? "Hide sensitive data" : "Reveal sensitive data"}
                                    onChange={handleToggleBypass}
                                />
                            </label>
                        </div>

                        {/* Redaction Level */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-xs">Redaction Level</span>
                            </label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={config.level}
                                onChange={(e) => handleLevelChange(e.target.value as 'strict' | 'moderate' | 'minimal')}
                            >
                                <option value="strict">Strict (max security)</option>
                                <option value="moderate">Moderate</option>
                                <option value="minimal">Minimal</option>
                            </select>
                        </div>

                        {/* Status indicator */}
                        <div className="mt-4 text-xs opacity-70">
                            Status: {bypassEnabled ? (
                                <span className="text-error font-bold">PII VISIBLE</span>
                            ) : (
                                <span className="text-success font-bold">PII Redacted</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RedactionDebugToggle;
