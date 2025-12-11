import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
    gradient?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
    className?: string;
}

const gradientMap = {
    primary: 'from-primary/20 via-primary/10 to-transparent',
    secondary: 'from-secondary/20 via-secondary/10 to-transparent',
    accent: 'from-accent/20 via-accent/10 to-transparent',
    success: 'from-success/20 via-success/10 to-transparent',
    warning: 'from-warning/20 via-warning/10 to-transparent',
    error: 'from-error/20 via-error/10 to-transparent',
};

const iconBgMap = {
    primary: 'bg-primary/20 text-primary',
    secondary: 'bg-secondary/20 text-secondary',
    accent: 'bg-accent/20 text-accent',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    error: 'bg-error/20 text-error',
};

/**
 * Consistent page header with gradient background, icon, and actions.
 * Use this at the top of every page for visual consistency.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    description,
    icon: Icon,
    actions,
    gradient = 'primary',
    className = '',
}) => {
    return (
        <div
            className={`
        relative overflow-hidden rounded-2xl p-6 mb-8
        bg-gradient-to-br ${gradientMap[gradient]}
        border border-base-300/30
        ${className}
      `}
        >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/5 to-transparent opacity-50 blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-4">
                    {Icon && (
                        <div className={`p-3 rounded-xl ${iconBgMap[gradient]} backdrop-blur-sm shadow-sm`}>
                            <Icon className="w-6 h-6" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-base-content/60 mt-1 text-sm">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {actions && (
                    <div className="flex flex-wrap gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
