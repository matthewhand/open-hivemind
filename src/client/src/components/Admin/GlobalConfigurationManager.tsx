import React, { useState, useEffect } from 'react';
import GlobalConfigSection from '../GlobalConfigSection';
import { Loading, Alert } from '../DaisyUI';

const GlobalConfigurationManager: React.FC = () => {
    const [sections, setSections] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<string>('message');

    useEffect(() => {
        fetchSections();
    }, []);

    const fetchSections = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/config/global');
            if (!res.ok) throw new Error('Failed to fetch configuration');
            const data = await res.json();
            // Data is Record<string, ConfigItem>, keys are section names
            const keys = Object.keys(data).sort();
            setSections(keys);
            if (keys.length > 0 && !keys.includes(activeSection)) {
                setActiveSection(keys[0]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;
    if (error) return <Alert status="error" message={error} />;

    return (
        <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 flex-shrink-0">
                <div className="card bg-base-100 shadow-lg border border-base-200 h-full">
                    <div className="card-body p-4">
                        <h3 className="font-bold text-lg mb-4 px-2">Settings Sections</h3>
                        {sections.length === 0 ? (
                            <div className="text-center py-8 text-base-content/50">
                                <p>No configuration sections found.</p>
                            </div>
                        ) : (
                            <ul className="menu bg-base-100 w-full p-2 rounded-box">
                                {sections.map(section => (
                                    <li key={section}>
                                        <a
                                            className={activeSection === section ? 'active' : ''}
                                            onClick={() => setActiveSection(section)}
                                        >
                                            <span className="capitalize">{section}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
                {activeSection ? (
                    <GlobalConfigSection section={activeSection} />
                ) : (
                    <div className="alert alert-info">Select a configuration section from the left.</div>
                )}
            </div>
        </div>
    );
};

export default GlobalConfigurationManager;
