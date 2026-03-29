import React from 'react';
import { Section } from './Section';

export const ButtonsDemo: React.FC = () => {
  return (
    <div className="space-y-8">
      <Section title="Button Colors">
        <div className="flex flex-wrap gap-2">
          <button className="btn">Default</button>
          <button className="btn btn-neutral">Neutral</button>
          <button className="btn btn-primary">Primary</button>
          <button className="btn btn-secondary">Secondary</button>
          <button className="btn btn-accent">Accent</button>
          <button className="btn btn-info">Info</button>
          <button className="btn btn-success">Success</button>
          <button className="btn btn-warning">Warning</button>
          <button className="btn btn-error">Error</button>
        </div>
      </Section>

      <Section title="Button Sizes">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-xs">Tiny</button>
          <button className="btn btn-sm">Small</button>
          <button className="btn btn-md">Medium</button>
          <button className="btn btn-lg">Large</button>
          <button className="btn btn-xl">Extra Large</button>
        </div>
      </Section>

      <Section title="Button Outline">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-outline">Default</button>
          <button className="btn btn-outline btn-primary">Primary</button>
          <button className="btn btn-outline btn-secondary">Secondary</button>
          <button className="btn btn-outline btn-accent">Accent</button>
          <button className="btn btn-outline btn-info">Info</button>
          <button className="btn btn-outline btn-success">Success</button>
          <button className="btn btn-outline btn-warning">Warning</button>
          <button className="btn btn-outline btn-error">Error</button>
        </div>
      </Section>

      <Section title="Button Soft">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-soft">Default</button>
          <button className="btn btn-soft btn-primary">Primary</button>
          <button className="btn btn-soft btn-secondary">Secondary</button>
          <button className="btn btn-soft btn-accent">Accent</button>
          <button className="btn btn-soft btn-info">Info</button>
          <button className="btn btn-soft btn-success">Success</button>
          <button className="btn btn-soft btn-warning">Warning</button>
          <button className="btn btn-soft btn-error">Error</button>
        </div>
      </Section>

      <Section title="Button States">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-active">Active</button>
          <button className="btn btn-disabled">Disabled</button>
          <button className="btn btn-ghost">Ghost</button>
          <button className="btn btn-link">Link</button>
        </div>
      </Section>

      <Section title="Button Shapes">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-wide">Wide</button>
          <button className="btn btn-square" aria-label="Close (square)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <button className="btn btn-circle" aria-label="Close (circle)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </Section>

      <Section title="Button with Loading">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary">
            <span className="loading loading-spinner"></span>
            Loading
          </button>
          <button className="btn btn-square" aria-label="Loading">
            <span className="loading loading-spinner"></span>
          </button>
        </div>
      </Section>
    </div>
  );
};
