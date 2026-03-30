import React from 'react';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
}

const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-16 w-16',
};

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className={`${sizeMap[size]} relative flex items-center justify-center overflow-hidden rounded-lg`}>
                {/* We use the generated logo asset */}
                <img
                    src="/logo.png"
                    alt="Open-Hivemind Logo"
                    className="object-cover w-full h-full"
                />
            </div>
            {showText && (
                <span className="font-bold tracking-tight text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Open-Hivemind
                </span>
            )}
        </div>
    );
};

export default Logo;
