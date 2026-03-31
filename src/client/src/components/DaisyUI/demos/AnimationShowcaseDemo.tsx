import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Section } from './Section';

/* ─── helpers ─── */

/** Force an element to re-run its CSS animation by toggling a key. */
function useReplay(): [number, () => void] {
  const [key, setKey] = useState(0);
  const replay = useCallback(() => setKey((k) => k + 1), []);
  return [key, replay];
}

/** Small code-snippet display */
const Code: React.FC<{ children: string }> = ({ children }) => (
  <pre className="bg-base-300 text-base-content text-xs rounded-lg p-3 overflow-x-auto mt-2 whitespace-pre-wrap">
    <code>{children}</code>
  </pre>
);

/* ─── Section 5: SavedStamp SVG component ─── */

type StampVariant = 'success' | 'info' | 'warning';

const variantColors: Record<StampVariant, { stroke: string; fill: string }> = {
  success: { stroke: 'hsl(var(--su))', fill: 'hsl(var(--su) / 0.15)' },
  info: { stroke: 'hsl(var(--in))', fill: 'hsl(var(--in) / 0.15)' },
  warning: { stroke: 'hsl(var(--wa))', fill: 'hsl(var(--wa) / 0.15)' },
};

const SavedStamp: React.FC<{
  text?: string;
  variant?: StampVariant;
  visible: boolean;
}> = ({ text = 'SAVED', variant = 'success', visible }) => {
  const colors = variantColors[variant];

  return (
    <div
      className="inline-flex items-center justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) rotate(-12deg)' : 'scale(1.6) rotate(-12deg)',
        transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
      }}
    >
      <svg width="180" height="72" viewBox="0 0 180 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="4" y="4" width="172" height="64" rx="12"
          stroke={colors.stroke} strokeWidth="4" strokeDasharray="8 4"
          fill={colors.fill}
        />
        <text
          x="90" y="44"
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight="800"
          fontSize="28"
          fill={colors.stroke}
          letterSpacing="4"
        >
          {text}
        </text>
      </svg>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Section components
   ────────────────────────────────────────────── */

/* --- Section 1: DaisyUI Built-in Animations --- */

const LoadingSpinnersSection: React.FC = () => {
  const types = ['spinner', 'dots', 'ring', 'ball', 'bars', 'infinity'] as const;
  const sizes = ['loading-xs', 'loading-sm', 'loading-md', 'loading-lg'] as const;

  return (
    <Section title="DaisyUI Built-in Animations">
      <p className="text-base-content/70 mb-4">
        DaisyUI ships with animated loading indicators, skeleton placeholders, and smooth toggle transitions.
      </p>

      {/* Loading spinners */}
      <h4 className="font-semibold mb-2">Loading Spinners</h4>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Type</th>
              {sizes.map((s) => (
                <th key={s} className="text-center">{s.replace('loading-', '')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type}>
                <td className="font-mono text-xs">{type}</td>
                {sizes.map((size) => (
                  <td key={size} className="text-center">
                    <span className={`loading loading-${type} ${size}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Code>{`<span class="loading loading-spinner loading-lg" />`}</Code>

      {/* Skeleton pulse */}
      <h4 className="font-semibold mt-6 mb-2">Skeleton Pulse</h4>
      <div className="flex flex-col gap-2 max-w-sm">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-32 w-full" />
      </div>
      <Code>{`<div class="skeleton h-4 w-full" />
<div class="skeleton h-32 w-full" />`}</Code>

      {/* Toggle / checkbox transitions */}
      <h4 className="font-semibold mt-6 mb-2">Toggle &amp; Checkbox Transitions</h4>
      <div className="flex flex-wrap items-center gap-4">
        <label className="label cursor-pointer gap-2">
          <span className="label-text">Toggle</span>
          <input type="checkbox" className="toggle toggle-primary" defaultChecked />
        </label>
        <label className="label cursor-pointer gap-2">
          <span className="label-text">Checkbox</span>
          <input type="checkbox" className="checkbox checkbox-secondary" defaultChecked />
        </label>
        <label className="label cursor-pointer gap-2">
          <span className="label-text">Toggle (accent)</span>
          <input type="checkbox" className="toggle toggle-accent" />
        </label>
      </div>
      <Code>{`<input type="checkbox" class="toggle toggle-primary" />
<input type="checkbox" class="checkbox checkbox-secondary" />`}</Code>
    </Section>
  );
};

/* --- Section 2: Tailwind Transition Utilities --- */

const TailwindTransitionsSection: React.FC = () => (
  <Section title="Tailwind Transition Utilities">
    <p className="text-base-content/70 mb-4">
      Tailwind CSS provides transition, duration, and easing utilities that pair well with DaisyUI.
    </p>

    {/* Hover transforms */}
    <h4 className="font-semibold mb-2">transition-all with hover transforms</h4>
    <div className="flex flex-wrap gap-4 mb-2">
      {[
        { label: 'Scale', cls: 'hover:scale-110' },
        { label: 'TranslateY', cls: 'hover:-translate-y-2' },
        { label: 'Rotate', cls: 'hover:rotate-12' },
      ].map(({ label, cls }) => (
        <div
          key={label}
          className={`w-24 h-24 rounded-xl bg-primary text-primary-content flex items-center justify-center font-semibold text-sm transition-all duration-300 cursor-pointer ${cls}`}
        >
          {label}
        </div>
      ))}
    </div>
    <Code>{`<div class="transition-all duration-300 hover:scale-110">Scale</div>
<div class="transition-all duration-300 hover:-translate-y-2">TranslateY</div>
<div class="transition-all duration-300 hover:rotate-12">Rotate</div>`}</Code>

    {/* Color transitions */}
    <h4 className="font-semibold mt-6 mb-2">transition-colors (theme-aware)</h4>
    <div className="flex flex-wrap gap-3 mb-2">
      <button className="btn transition-colors duration-300 hover:bg-primary hover:text-primary-content">
        Hover me
      </button>
      <button className="btn btn-outline transition-colors duration-300 hover:bg-secondary hover:text-secondary-content hover:border-secondary">
        Color shift
      </button>
    </div>
    <Code>{`<button class="btn transition-colors duration-300 hover:bg-primary hover:text-primary-content">Hover me</button>`}</Code>

    {/* Shadow transitions */}
    <h4 className="font-semibold mt-6 mb-2">transition-shadow</h4>
    <div className="flex flex-wrap gap-4 mb-2">
      {['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl'].map((s) => (
        <div
          key={s}
          className={`w-24 h-24 rounded-xl bg-base-100 border border-base-300 flex items-center justify-center text-xs font-mono transition-shadow duration-300 hover:shadow-2xl cursor-pointer ${s}`}
        >
          {s}
        </div>
      ))}
    </div>
    <Code>{`<div class="shadow-sm transition-shadow duration-300 hover:shadow-2xl">...</div>`}</Code>

    {/* Duration comparison */}
    <h4 className="font-semibold mt-6 mb-2">Duration comparison</h4>
    <div className="flex flex-wrap gap-4 mb-2">
      {[150, 200, 300].map((ms) => (
        <div
          key={ms}
          className="w-28 h-20 rounded-xl bg-accent text-accent-content flex items-center justify-center text-sm font-semibold cursor-pointer hover:scale-110"
          style={{ transitionProperty: 'transform', transitionDuration: `${ms}ms` }}
        >
          {ms}ms
        </div>
      ))}
    </div>
    <Code>{`<div class="hover:scale-110" style="transition-duration: 150ms">150ms</div>`}</Code>

    {/* Easing comparison */}
    <h4 className="font-semibold mt-6 mb-2">Easing comparison</h4>
    <div className="flex flex-wrap gap-4">
      {[
        { label: 'ease-in', cls: 'ease-in' },
        { label: 'ease-out', cls: 'ease-out' },
        { label: 'ease-in-out', cls: 'ease-in-out' },
      ].map(({ label, cls }) => (
        <div
          key={label}
          className={`w-28 h-20 rounded-xl bg-secondary text-secondary-content flex flex-col items-center justify-center text-sm font-semibold cursor-pointer transition-transform duration-500 hover:scale-110 ${cls}`}
        >
          <span>{label}</span>
        </div>
      ))}
    </div>
    <Code>{`<div class="transition-transform duration-500 ease-in hover:scale-110">ease-in</div>`}</Code>
  </Section>
);

/* --- Section 3: Custom Keyframe Animations --- */

interface KeyframeDef {
  name: string;
  css: string;
  style: React.CSSProperties;
}

const keyframes: KeyframeDef[] = [
  {
    name: 'fadeIn',
    css: `@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}`,
    style: { animation: 'fadeIn 0.6s ease-out forwards' },
  },
  {
    name: 'modalScale',
    css: `@keyframes modalScale {
  from { opacity: 0; transform: scale(0.9) translateY(-10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}`,
    style: { animation: 'modalScale 0.4s ease-out forwards' },
  },
  {
    name: 'alertSlide',
    css: `@keyframes alertSlide {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}`,
    style: { animation: 'alertSlide 0.5s ease-out forwards' },
  },
  {
    name: 'pulse',
    css: `@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}`,
    style: { animation: 'pulse 1.5s ease-in-out infinite' },
  },
  {
    name: 'dropdownSlide',
    css: `@keyframes dropdownSlide {
  from { opacity: 0; transform: translateY(-8px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}`,
    style: { animation: 'dropdownSlide 0.3s ease-out forwards' },
  },
  {
    name: 'progressGlow',
    css: `@keyframes progressGlow {
  0%, 100% { box-shadow: 0 0 12px hsl(var(--p) / 0.5); }
  50%      { box-shadow: 0 0 20px hsl(var(--p) / 0.8); }
}`,
    style: { animation: 'progressGlow 2s ease-in-out infinite' },
  },
  {
    name: 'tooltipFade',
    css: `@keyframes tooltipFade {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}`,
    style: { animation: 'tooltipFade 0.25s ease-out forwards' },
  },
];

const KeyframeCard: React.FC<{ kf: KeyframeDef }> = ({ kf }) => {
  const [key, replay] = useReplay();

  return (
    <div className="border border-base-300 rounded-xl p-4 bg-base-100">
      <div className="flex items-center justify-between mb-3">
        <span className="badge badge-primary font-mono">{kf.name}</span>
        <button className="btn btn-xs btn-ghost" onClick={replay}>
          Replay
        </button>
      </div>
      <div className="flex items-center justify-center h-20 bg-base-200 rounded-lg mb-3">
        <div
          key={key}
          className="w-14 h-14 rounded-lg bg-primary text-primary-content flex items-center justify-center text-xl font-bold"
          style={kf.style}
        >
          A
        </div>
      </div>
      <Code>{kf.css}</Code>
    </div>
  );
};

const KeyframeAnimationsSection: React.FC = () => (
  <Section title="Custom Keyframe Animations">
    <p className="text-base-content/70 mb-4">
      All 7 custom keyframes defined in <code className="text-xs bg-base-300 px-1 rounded">index.css</code>. Click
      <strong> Replay</strong> to re-trigger each animation.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {keyframes.map((kf) => (
        <KeyframeCard key={kf.name} kf={kf} />
      ))}
    </div>
  </Section>
);

/* --- Section 4: Advanced Patterns --- */

const AdvancedPatternsSection: React.FC = () => {
  const [showList, setShowList] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const items = ['Inbox', 'Drafts', 'Sent', 'Trash', 'Spam'];

  return (
    <Section title="Advanced Patterns">
      <p className="text-base-content/70 mb-4">
        Combining multiple utilities for richer animation effects.
      </p>

      {/* Staggered list */}
      <h4 className="font-semibold mb-2">Staggered List Animation</h4>
      <button className="btn btn-sm btn-primary mb-3" onClick={() => setShowList((v) => !v)}>
        {showList ? 'Reset' : 'Reveal list'}
      </button>
      <ul className="menu bg-base-200 rounded-box w-56 mb-2">
        {items.map((item, i) => (
          <li key={item}>
            <a
              className="transition-all duration-300"
              style={{
                opacity: showList ? 1 : 0,
                transform: showList ? 'translateX(0)' : 'translateX(-20px)',
                transitionDelay: `${i * 80}ms`,
              }}
            >
              {item}
            </a>
          </li>
        ))}
      </ul>
      <Code>{`style={{
  opacity: show ? 1 : 0,
  transform: show ? 'translateX(0)' : 'translateX(-20px)',
  transitionDelay: \`\${index * 80}ms\`,
}}`}</Code>

      {/* Multi-property card hover */}
      <h4 className="font-semibold mt-6 mb-2">Multi-property Card Hover</h4>
      <div className="flex flex-wrap gap-4 mb-2">
        {['primary', 'secondary', 'accent'].map((color) => (
          <div
            key={color}
            className={`w-40 h-28 rounded-xl bg-base-100 border-2 border-base-300 flex items-center justify-center font-semibold cursor-pointer
              transition-all duration-300
              hover:-translate-y-1 hover:shadow-xl hover:border-${color}`}
          >
            {color}
          </div>
        ))}
      </div>
      <Code>{`<div class="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary">...</div>`}</Code>

      {/* Backdrop blur overlay */}
      <h4 className="font-semibold mt-6 mb-2">Backdrop Blur Overlay</h4>
      <div className="relative h-40 rounded-xl overflow-hidden mb-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-lg font-bold">
          Background content
        </div>
        {showOverlay && (
          <div
            className="absolute inset-0 backdrop-blur-sm bg-base-300/40 flex items-center justify-center"
            style={{ animation: 'fadeIn 0.3s ease-out forwards' }}
          >
            <div className="card bg-base-100 shadow-xl p-4" style={{ animation: 'modalScale 0.35s ease-out forwards' }}>
              <p className="font-semibold">Overlay content</p>
              <button className="btn btn-sm btn-ghost mt-2" onClick={() => setShowOverlay(false)}>
                Dismiss
              </button>
            </div>
          </div>
        )}
        {!showOverlay && (
          <button
            className="absolute bottom-3 right-3 btn btn-sm btn-primary"
            onClick={() => setShowOverlay(true)}
          >
            Show overlay
          </button>
        )}
      </div>
      <Code>{`<div class="backdrop-blur-sm bg-base-300/40">...</div>`}</Code>

      {/* Gradient animation */}
      <h4 className="font-semibold mt-6 mb-2">Gradient Animation</h4>
      <div
        className="h-16 rounded-xl"
        style={{
          background: 'linear-gradient(270deg, hsl(var(--p)), hsl(var(--s)), hsl(var(--a)), hsl(var(--p)))',
          backgroundSize: '600% 600%',
          animation: 'gradientShift 6s ease infinite',
        }}
      />
      <Code>{`@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`}</Code>
      {/* Inject gradient keyframe via style tag */}
      <style>{`@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`}</style>
    </Section>
  );
};

/* --- Section 5: Custom SVG Animation (Rubber Stamp) --- */

const RubberStampSection: React.FC = () => {
  const [stampState, setStampState] = useState<{ visible: boolean; variant: StampVariant; text: string }>({
    visible: false,
    variant: 'success',
    text: 'SAVED',
  });
  const [customText, setCustomText] = useState('SAVED');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerStamp = (variant: StampVariant) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // Reset then show
    setStampState({ visible: false, variant, text: customText });
    requestAnimationFrame(() => {
      setStampState({ visible: true, variant, text: customText });
    });
    timerRef.current = setTimeout(() => {
      setStampState((prev) => ({ ...prev, visible: false }));
    }, 2000);
  };

  return (
    <Section title="Custom SVG Animation -- The Rubber Stamp">
      <p className="text-base-content/70 mb-4">
        An SVG-based stamp that scales in with a satisfying pop. Trigger it with each variant below.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Custom message</span>
          </label>
          <input
            type="text"
            className="input input-bordered input-sm w-40"
            value={customText}
            maxLength={12}
            onChange={(e) => setCustomText(e.target.value.toUpperCase())}
          />
        </div>
        <button className="btn btn-sm btn-success" onClick={() => triggerStamp('success')}>
          Save (Success)
        </button>
        <button className="btn btn-sm btn-info" onClick={() => triggerStamp('info')}>
          Save (Info)
        </button>
        <button className="btn btn-sm btn-warning" onClick={() => triggerStamp('warning')}>
          Save (Warning)
        </button>
      </div>

      <div className="flex items-center justify-center h-28 bg-base-200 rounded-xl">
        <SavedStamp text={stampState.text} variant={stampState.variant} visible={stampState.visible} />
      </div>
      <Code>{`<SavedStamp text="SAVED" variant="success" visible={true} />
/* Scales from 1.6x to 1x with opacity fade-in */`}</Code>
    </Section>
  );
};

/* --- Section 6: Reduced Motion --- */

const ReducedMotionSection: React.FC = () => {
  const [simulateReduced, setSimulateReduced] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply a class to the container that disables animations
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (simulateReduced) {
      el.classList.add('reduce-motion-sim');
    } else {
      el.classList.remove('reduce-motion-sim');
    }
  }, [simulateReduced]);

  return (
    <Section title="Reduced Motion">
      <p className="text-base-content/70 mb-4">
        Users with <code className="text-xs bg-base-300 px-1 rounded">prefers-reduced-motion: reduce</code> should see
        simplified or no animations. Toggle below to simulate.
      </p>

      <label className="label cursor-pointer gap-2 w-fit mb-4">
        <span className="label-text font-semibold">Simulate reduced motion</span>
        <input
          type="checkbox"
          className="toggle toggle-warning"
          checked={simulateReduced}
          onChange={(e) => setSimulateReduced(e.target.checked)}
        />
      </label>

      <div ref={containerRef}>
        <style>{`
.reduce-motion-sim *,
.reduce-motion-sim *::before,
.reduce-motion-sim *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
        `}</style>

        <div className="flex flex-wrap gap-4">
          <div className="w-16 h-16 bg-primary rounded-lg animate-bounce" />
          <div className="w-16 h-16 bg-secondary rounded-lg animate-spin" />
          <div className="w-16 h-16 bg-accent rounded-lg animate-pulse" />
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="loading loading-dots loading-lg text-secondary" />
        </div>
      </div>

      <Code>{`@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`}</Code>

      <div className="alert alert-info mt-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>
          In production, use the CSS media query <code className="font-mono text-xs">@media (prefers-reduced-motion: reduce)</code> rather
          than JavaScript toggling. The simulation above is for demonstration only.
        </span>
      </div>
    </Section>
  );
};

/* ──────────────────────────────────────────────
   Main export
   ────────────────────────────────────────────── */

export const AnimationShowcaseDemo: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="mb-2">
        <h2 className="text-2xl font-bold">Animation Showcase</h2>
        <p className="text-base-content/60 mt-1">
          A comprehensive reference of every animation capability available in the project --
          DaisyUI built-ins, Tailwind transitions, custom keyframes, and advanced patterns.
        </p>
      </div>

      <LoadingSpinnersSection />
      <TailwindTransitionsSection />
      <KeyframeAnimationsSection />
      <AdvancedPatternsSection />
      <RubberStampSection />
      <ReducedMotionSection />
    </div>
  );
};

export default AnimationShowcaseDemo;
