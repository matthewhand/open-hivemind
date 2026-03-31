import React, { useEffect, useState, useCallback } from 'react';

interface SavedStampProps {
  visible: boolean;
  onComplete?: () => void;
  message?: string;
  variant?: 'success' | 'info' | 'warning';
}

const variantColors: Record<string, { main: string; glow: string }> = {
  success: { main: 'oklch(var(--su))', glow: 'oklch(var(--su) / 0.4)' },
  info: { main: 'oklch(var(--in))', glow: 'oklch(var(--in) / 0.4)' },
  warning: { main: 'oklch(var(--wa))', glow: 'oklch(var(--wa) / 0.4)' },
};

type AnimationPhase = 'idle' | 'drop' | 'impact' | 'hold' | 'fade' | 'done';

const SavedStamp: React.FC<SavedStampProps> = ({
  visible,
  onComplete,
  message = 'SAVED',
  variant = 'success',
}) => {
  const [phase, setPhase] = useState<AnimationPhase>('idle');
  const [mounted, setMounted] = useState(false);

  const colors = variantColors[variant] || variantColors.success;

  const runSequence = useCallback(() => {
    setMounted(true);
    setPhase('drop');

    // Drop -> Impact at 400ms
    const t1 = setTimeout(() => setPhase('impact'), 400);
    // Impact -> Hold at 600ms
    const t2 = setTimeout(() => setPhase('hold'), 600);
    // Hold -> Fade at 2000ms
    const t3 = setTimeout(() => setPhase('fade'), 2000);
    // Fade -> Done at 3000ms
    const t4 = setTimeout(() => {
      setPhase('done');
      setMounted(false);
      onComplete?.();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  useEffect(() => {
    if (visible) {
      const cleanup = runSequence();
      return cleanup;
    } else {
      setPhase('idle');
      setMounted(false);
    }
  }, [visible, runSequence]);

  if (!mounted) return null;

  // Determine animation classes/styles per phase
  const getStampStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      pointerEvents: 'none',
    };

    if (phase === 'drop') {
      return {
        ...base,
        animation: 'stampDrop 0.4s cubic-bezier(0.35, 0, 0.85, 0.4) forwards',
      };
    }
    if (phase === 'impact') {
      return {
        ...base,
        animation: 'stampShake 0.2s ease-out',
      };
    }
    if (phase === 'fade') {
      return {
        ...base,
        animation: 'stampFadeOut 1s ease-in forwards',
      };
    }
    return base;
  };

  const getStampGroupStyle = (): React.CSSProperties => {
    if (phase === 'impact') {
      return {
        animation: 'stampImpact 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        transform: 'rotate(-5deg)',
      };
    }
    if (phase === 'drop') {
      return {
        transform: 'translateY(-200px) rotate(-3deg)',
      };
    }
    return {
      transform: 'rotate(-5deg)',
    };
  };

  // Handle visibility fades on the stamp handle
  const handleOpacity =
    phase === 'hold' || phase === 'fade' ? 0 : 1;
  const handleTranslate =
    phase === 'hold' || phase === 'fade' ? -60 : 0;

  return (
    <div style={getStampStyle()} aria-live="assertive" role="status">
      <div style={getStampGroupStyle()}>
        <svg
          width="320"
          height="200"
          viewBox="0 0 320 200"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Roughness filter for stamp texture */}
            <filter id="stampRough" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.04"
                numOctaves="4"
                seed="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="3"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>

            {/* Ink splatter filter for impact */}
            <filter id="stampInkSplatter" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.06"
                numOctaves="3"
                seed="7"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={phase === 'impact' ? '6' : '3'}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>

          {/* Stamp handle - visible during drop, retracts during hold */}
          <g
            style={{
              opacity: handleOpacity,
              transform: `translateY(${handleTranslate}px)`,
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            {/* Handle shaft */}
            <rect
              x="140"
              y="-80"
              width="40"
              height="70"
              rx="6"
              fill="oklch(var(--bc) / 0.3)"
              stroke="oklch(var(--bc) / 0.5)"
              strokeWidth="2"
            />
            {/* Handle grip */}
            <rect
              x="130"
              y="-95"
              width="60"
              height="25"
              rx="8"
              fill="oklch(var(--bc) / 0.4)"
              stroke="oklch(var(--bc) / 0.6)"
              strokeWidth="2"
            />
            {/* Grip ridges */}
            <line x1="145" y1="-90" x2="145" y2="-75" stroke="oklch(var(--bc) / 0.2)" strokeWidth="1.5" />
            <line x1="155" y1="-90" x2="155" y2="-75" stroke="oklch(var(--bc) / 0.2)" strokeWidth="1.5" />
            <line x1="165" y1="-90" x2="165" y2="-75" stroke="oklch(var(--bc) / 0.2)" strokeWidth="1.5" />
            <line x1="175" y1="-90" x2="175" y2="-75" stroke="oklch(var(--bc) / 0.2)" strokeWidth="1.5" />
          </g>

          {/* Stamp body with rough edges */}
          <g filter="url(#stampRough)">
            {/* Outer border */}
            <rect
              x="10"
              y="20"
              width="300"
              height="160"
              rx="12"
              fill="none"
              stroke={colors.main}
              strokeWidth="6"
              opacity={phase === 'impact' ? 1 : 0.85}
            />
            {/* Inner border (double-line stamp look) */}
            <rect
              x="22"
              y="32"
              width="276"
              height="136"
              rx="8"
              fill="none"
              stroke={colors.main}
              strokeWidth="2.5"
              opacity={phase === 'impact' ? 0.9 : 0.7}
            />
          </g>

          {/* Ink splatter burst on impact */}
          {phase === 'impact' && (
            <g filter="url(#stampInkSplatter)" opacity="0.3">
              <rect
                x="5"
                y="15"
                width="310"
                height="170"
                rx="14"
                fill="none"
                stroke={colors.main}
                strokeWidth="4"
              />
            </g>
          )}

          {/* Main text */}
          <text
            x="160"
            y="115"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="'Inter', system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="64"
            letterSpacing="8"
            fill={colors.main}
            filter="url(#stampRough)"
            opacity={phase === 'impact' ? 1 : 0.85}
          >
            {message}
          </text>

          {/* Decorative stars / dots at corners */}
          <circle cx="36" cy="46" r="4" fill={colors.main} opacity="0.6" filter="url(#stampRough)" />
          <circle cx="284" cy="46" r="4" fill={colors.main} opacity="0.6" filter="url(#stampRough)" />
          <circle cx="36" cy="154" r="4" fill={colors.main} opacity="0.6" filter="url(#stampRough)" />
          <circle cx="284" cy="154" r="4" fill={colors.main} opacity="0.6" filter="url(#stampRough)" />
        </svg>

        {/* Impact glow ring */}
        {phase === 'impact' && (
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              boxShadow: `0 0 40px 10px ${colors.glow}, 0 0 80px 20px ${colors.glow}`,
              animation: 'stampImpact 0.2s ease-out forwards',
              opacity: 0.5,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SavedStamp;
