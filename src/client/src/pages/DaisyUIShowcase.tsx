/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { BotChatTimeline } from '../components/BotChatTimeline';
import BotChatBubbles from '../components/BotChatBubbles';

/**
 * DaisyUI Component Showcase
 * This page demonstrates DaisyUI components using raw CSS classes
 * exactly as shown in the official DaisyUI documentation.
 * https://daisyui.com/components/
 */
const DaisyUIShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('button');
  const [modalOpen, setModalOpen] = useState(false);

  const components = [
    'button', 'badge', 'alert', 'card', 'input', 'select', 'checkbox',
    'toggle', 'radio', 'range', 'modal', 'dropdown', 'tabs', 'tooltip',
    'avatar', 'progress', 'loading', 'table', 'menu', 'collapse',
    // High-priority additions
    'skeleton', 'breadcrumbs', 'textarea', 'file-input', 'steps', 'stat',
    // Medium-priority additions
    'chat', 'timeline', 'carousel', 'toast',
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">DaisyUI Component Reference</h1>
        <p className="text-base-content/60 mt-1">
          Official DaisyUI components using raw CSS classes -
          <a href="https://daisyui.com/components/" target="_blank" rel="noopener noreferrer" className="link link-primary ml-1">
            View Official Docs
          </a>
        </p>
      </div>

      {/* Component Navigation */}
      <div className="tabs tabs-boxed mb-6 flex-wrap">
        {components.map(comp => (
          <button
            key={comp}
            className={`tab ${activeTab === comp ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(comp)}
          >
            {comp.charAt(0).toUpperCase() + comp.slice(1)}
          </button>
        ))}
      </div>

      {/* ===== BUTTON ===== */}
      {activeTab === 'button' && (
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
              <button className="btn btn-square">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button className="btn btn-circle">
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
              <button className="btn btn-square">
                <span className="loading loading-spinner"></span>
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ===== BADGE ===== */}
      {activeTab === 'badge' && (
        <div className="space-y-8">
          <Section title="Badge Colors">
            <div className="flex flex-wrap gap-2">
              <span className="badge">Default</span>
              <span className="badge badge-neutral">Neutral</span>
              <span className="badge badge-primary">Primary</span>
              <span className="badge badge-secondary">Secondary</span>
              <span className="badge badge-accent">Accent</span>
              <span className="badge badge-ghost">Ghost</span>
            </div>
          </Section>

          <Section title="Badge Status Colors">
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-info">Info</span>
              <span className="badge badge-success">Success</span>
              <span className="badge badge-warning">Warning</span>
              <span className="badge badge-error">Error</span>
            </div>
          </Section>

          <Section title="Badge Outline">
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-outline">Default</span>
              <span className="badge badge-outline badge-primary">Primary</span>
              <span className="badge badge-outline badge-secondary">Secondary</span>
              <span className="badge badge-outline badge-accent">Accent</span>
            </div>
          </Section>

          <Section title="Badge Sizes">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-xs">Tiny</span>
              <span className="badge badge-sm">Small</span>
              <span className="badge badge-md">Medium</span>
              <span className="badge badge-lg">Large</span>
              <span className="badge badge-xl">Extra Large</span>
            </div>
          </Section>
        </div>
      )}

      {/* ===== ALERT ===== */}
      {activeTab === 'alert' && (
        <div className="space-y-8">
          <Section title="Alert Types">
            <div className="space-y-2">
              <div className="alert">
                <span>Default alert message</span>
              </div>
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Info: New software update available.</span>
              </div>
              <div className="alert alert-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Success: Your purchase has been confirmed!</span>
              </div>
              <div className="alert alert-warning">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span>Warning: Invalid email address!</span>
              </div>
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Error: Access denied!</span>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== CARD ===== */}
      {activeTab === 'card' && (
        <div className="space-y-8">
          <Section title="Card Styles">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Card Title</h2>
                  <p>Card content goes here.</p>
                  <div className="card-actions justify-end">
                    <button className="btn btn-primary">Action</button>
                  </div>
                </div>
              </div>
              <div className="card bg-primary text-primary-content">
                <div className="card-body">
                  <h2 className="card-title">Primary Card</h2>
                  <p>Colored background card.</p>
                </div>
              </div>
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h2 className="card-title">Bordered Card</h2>
                  <p>Card with border instead of shadow.</p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Card Compact">
            <div className="card card-compact bg-base-100 shadow-xl w-96">
              <div className="card-body">
                <h2 className="card-title">Compact Card</h2>
                <p>Less padding for compact layout.</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary btn-sm">Buy Now</button>
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== INPUT ===== */}
      {activeTab === 'input' && (
        <div className="space-y-8">
          <Section title="Input Types">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Type here" className="input input-bordered w-full" />
              <input type="text" placeholder="Primary" className="input input-bordered input-primary w-full" />
              <input type="text" placeholder="Secondary" className="input input-bordered input-secondary w-full" />
              <input type="text" placeholder="Accent" className="input input-bordered input-accent w-full" />
              <input type="text" placeholder="Info" className="input input-bordered input-info w-full" />
              <input type="text" placeholder="Success" className="input input-bordered input-success w-full" />
              <input type="text" placeholder="Warning" className="input input-bordered input-warning w-full" />
              <input type="text" placeholder="Error" className="input input-bordered input-error w-full" />
            </div>
          </Section>

          <Section title="Input Sizes">
            <div className="flex flex-col gap-2">
              <input type="text" placeholder="xs" className="input input-bordered input-xs w-full max-w-xs" />
              <input type="text" placeholder="sm" className="input input-bordered input-sm w-full max-w-xs" />
              <input type="text" placeholder="md" className="input input-bordered input-md w-full max-w-xs" />
              <input type="text" placeholder="lg" className="input input-bordered input-lg w-full max-w-xs" />
            </div>
          </Section>

          <Section title="Input with Label">
            <label className="form-control w-full max-w-xs">
              <div className="label">
                <span className="label-text">What is your name?</span>
                <span className="label-text-alt">Optional</span>
              </div>
              <input type="text" placeholder="Type here" className="input input-bordered w-full max-w-xs" />
              <div className="label">
                <span className="label-text-alt">Helper text</span>
              </div>
            </label>
          </Section>
        </div>
      )}

      {/* ===== SELECT ===== */}
      {activeTab === 'select' && (
        <div className="space-y-8">
          <Section title="Select Styles">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="select select-bordered w-full">
                <option disabled selected>Pick one</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
              <select className="select select-bordered select-primary w-full">
                <option disabled selected>Primary</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
              <select className="select select-bordered select-secondary w-full">
                <option disabled selected>Secondary</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
              <select className="select select-ghost w-full">
                <option disabled selected>Ghost</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </Section>

          <Section title="Select Sizes">
            <div className="flex flex-col gap-2">
              <select className="select select-bordered select-xs w-full max-w-xs">
                <option>Tiny</option>
              </select>
              <select className="select select-bordered select-sm w-full max-w-xs">
                <option>Small</option>
              </select>
              <select className="select select-bordered select-md w-full max-w-xs">
                <option>Medium</option>
              </select>
              <select className="select select-bordered select-lg w-full max-w-xs">
                <option>Large</option>
              </select>
            </div>
          </Section>
        </div>
      )}

      {/* ===== CHECKBOX ===== */}
      {activeTab === 'checkbox' && (
        <div className="space-y-8">
          <Section title="Checkbox Colors">
            <div className="flex flex-wrap gap-4">
              <input type="checkbox" className="checkbox" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-primary" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-secondary" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-accent" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-info" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-success" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-warning" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-error" defaultChecked />
            </div>
          </Section>

          <Section title="Checkbox Sizes">
            <div className="flex flex-wrap items-center gap-4">
              <input type="checkbox" className="checkbox checkbox-xs" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-sm" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-md" defaultChecked />
              <input type="checkbox" className="checkbox checkbox-lg" defaultChecked />
            </div>
          </Section>

          <Section title="Checkbox with Label">
            <div className="form-control">
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" className="checkbox checkbox-primary" />
                <span className="label-text">Remember me</span>
              </label>
            </div>
          </Section>
        </div>
      )}

      {/* ===== TOGGLE ===== */}
      {activeTab === 'toggle' && (
        <div className="space-y-8">
          <Section title="Toggle Colors">
            <div className="flex flex-wrap gap-4">
              <input type="checkbox" className="toggle" defaultChecked />
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
              <input type="checkbox" className="toggle toggle-secondary" defaultChecked />
              <input type="checkbox" className="toggle toggle-accent" defaultChecked />
              <input type="checkbox" className="toggle toggle-info" defaultChecked />
              <input type="checkbox" className="toggle toggle-success" defaultChecked />
              <input type="checkbox" className="toggle toggle-warning" defaultChecked />
              <input type="checkbox" className="toggle toggle-error" defaultChecked />
            </div>
          </Section>

          <Section title="Toggle Sizes">
            <div className="flex flex-wrap items-center gap-4">
              <input type="checkbox" className="toggle toggle-xs" defaultChecked />
              <input type="checkbox" className="toggle toggle-sm" defaultChecked />
              <input type="checkbox" className="toggle toggle-md" defaultChecked />
              <input type="checkbox" className="toggle toggle-lg" defaultChecked />
            </div>
          </Section>
        </div>
      )}

      {/* ===== RADIO ===== */}
      {activeTab === 'radio' && (
        <div className="space-y-8">
          <Section title="Radio Colors">
            <div className="flex flex-wrap gap-4">
              <input type="radio" name="radio-colors" className="radio" defaultChecked />
              <input type="radio" name="radio-colors" className="radio radio-primary" />
              <input type="radio" name="radio-colors" className="radio radio-secondary" />
              <input type="radio" name="radio-colors" className="radio radio-accent" />
              <input type="radio" name="radio-colors" className="radio radio-success" />
              <input type="radio" name="radio-colors" className="radio radio-warning" />
              <input type="radio" name="radio-colors" className="radio radio-info" />
              <input type="radio" name="radio-colors" className="radio radio-error" />
            </div>
          </Section>

          <Section title="Radio Sizes">
            <div className="flex flex-wrap items-center gap-4">
              <input type="radio" name="radio-sizes" className="radio radio-xs" defaultChecked />
              <input type="radio" name="radio-sizes" className="radio radio-sm" />
              <input type="radio" name="radio-sizes" className="radio radio-md" />
              <input type="radio" name="radio-sizes" className="radio radio-lg" />
            </div>
          </Section>
        </div>
      )}

      {/* ===== RANGE ===== */}
      {activeTab === 'range' && (
        <div className="space-y-8">
          <Section title="Range Colors">
            <div className="flex flex-col gap-4 w-full max-w-md">
              <input type="range" min="0" max="100" className="range" />
              <input type="range" min="0" max="100" className="range range-primary" />
              <input type="range" min="0" max="100" className="range range-secondary" />
              <input type="range" min="0" max="100" className="range range-accent" />
              <input type="range" min="0" max="100" className="range range-success" />
              <input type="range" min="0" max="100" className="range range-warning" />
              <input type="range" min="0" max="100" className="range range-info" />
              <input type="range" min="0" max="100" className="range range-error" />
            </div>
          </Section>

          <Section title="Range Sizes">
            <div className="flex flex-col gap-4 w-full max-w-md">
              <input type="range" className="range range-xs" />
              <input type="range" className="range range-sm" />
              <input type="range" className="range range-md" />
              <input type="range" className="range range-lg" />
            </div>
          </Section>

          <Section title="Range with Steps">
            <input type="range" min="0" max="100" defaultValue="25" className="range" step="25" />
            <div className="w-full flex justify-between text-xs px-2">
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
            </div>
          </Section>
        </div>
      )}

      {/* ===== MODAL ===== */}
      {activeTab === 'modal' && (
        <div className="space-y-8">
          <Section title="Modal">
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Open Modal</button>
          </Section>
        </div>
      )}

      {/* ===== DROPDOWN ===== */}
      {activeTab === 'dropdown' && (
        <div className="space-y-8">
          <Section title="Dropdown Positions">
            <div className="flex flex-wrap gap-4">
              <div className="dropdown">
                <div tabIndex={0} role="button" className="btn m-1">Click</div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                  <li><a>Item 1</a></li>
                  <li><a>Item 2</a></li>
                </ul>
              </div>
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn m-1">Dropdown End</div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                  <li><a>Item 1</a></li>
                  <li><a>Item 2</a></li>
                </ul>
              </div>
              <div className="dropdown dropdown-top">
                <div tabIndex={0} role="button" className="btn m-1">Dropdown Top</div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                  <li><a>Item 1</a></li>
                  <li><a>Item 2</a></li>
                </ul>
              </div>
              <div className="dropdown dropdown-hover">
                <div tabIndex={0} role="button" className="btn m-1">Hover</div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                  <li><a>Item 1</a></li>
                  <li><a>Item 2</a></li>
                </ul>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== TABS ===== */}
      {activeTab === 'tabs' && (
        <div className="space-y-8">
          <Section title="Tab Styles">
            <div role="tablist" className="tabs tabs-boxed">
              <a role="tab" className="tab">Tab 1</a>
              <a role="tab" className="tab tab-active">Tab 2</a>
              <a role="tab" className="tab">Tab 3</a>
            </div>
          </Section>

          <Section title="Tab Bordered">
            <div role="tablist" className="tabs tabs-bordered">
              <a role="tab" className="tab">Tab 1</a>
              <a role="tab" className="tab tab-active">Tab 2</a>
              <a role="tab" className="tab">Tab 3</a>
            </div>
          </Section>

          <Section title="Tab Lifted">
            <div role="tablist" className="tabs tabs-lifted">
              <a role="tab" className="tab">Tab 1</a>
              <a role="tab" className="tab tab-active">Tab 2</a>
              <a role="tab" className="tab">Tab 3</a>
            </div>
          </Section>

          <Section title="Tab Sizes">
            <div role="tablist" className="tabs tabs-boxed tabs-xs">
              <a role="tab" className="tab">Tiny</a>
              <a role="tab" className="tab tab-active">Tiny</a>
            </div>
            <div role="tablist" className="tabs tabs-boxed tabs-sm mt-2">
              <a role="tab" className="tab">Small</a>
              <a role="tab" className="tab tab-active">Small</a>
            </div>
            <div role="tablist" className="tabs tabs-boxed tabs-lg mt-2">
              <a role="tab" className="tab">Large</a>
              <a role="tab" className="tab tab-active">Large</a>
            </div>
          </Section>
        </div>
      )}

      {/* ===== TOOLTIP ===== */}
      {activeTab === 'tooltip' && (
        <div className="space-y-8">
          <Section title="Tooltip Positions">
            <div className="flex flex-wrap gap-4">
              <div className="tooltip" data-tip="hello">
                <button className="btn">Top</button>
              </div>
              <div className="tooltip tooltip-bottom" data-tip="hello">
                <button className="btn">Bottom</button>
              </div>
              <div className="tooltip tooltip-left" data-tip="hello">
                <button className="btn">Left</button>
              </div>
              <div className="tooltip tooltip-right" data-tip="hello">
                <button className="btn">Right</button>
              </div>
            </div>
          </Section>

          <Section title="Tooltip Colors">
            <div className="flex flex-wrap gap-4">
              <div className="tooltip tooltip-primary" data-tip="primary">
                <button className="btn">Primary</button>
              </div>
              <div className="tooltip tooltip-secondary" data-tip="secondary">
                <button className="btn">Secondary</button>
              </div>
              <div className="tooltip tooltip-accent" data-tip="accent">
                <button className="btn">Accent</button>
              </div>
              <div className="tooltip tooltip-info" data-tip="info">
                <button className="btn">Info</button>
              </div>
              <div className="tooltip tooltip-success" data-tip="success">
                <button className="btn">Success</button>
              </div>
              <div className="tooltip tooltip-warning" data-tip="warning">
                <button className="btn">Warning</button>
              </div>
              <div className="tooltip tooltip-error" data-tip="error">
                <button className="btn">Error</button>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== AVATAR ===== */}
      {activeTab === 'avatar' && (
        <div className="space-y-8">
          <Section title="Avatar Sizes">
            <div className="flex items-center gap-4">
              <div className="avatar">
                <div className="w-8 rounded"><img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" alt="Avatar example" /></div>
              </div>
              <div className="avatar">
                <div className="w-12 rounded"><img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" alt="Avatar example" /></div>
              </div>
              <div className="avatar">
                <div className="w-16 rounded"><img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" alt="Avatar example" /></div>
              </div>
              <div className="avatar">
                <div className="w-24 rounded"><img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" alt="Avatar example" /></div>
              </div>
            </div>
          </Section>

          <Section title="Avatar Shapes">
            <div className="flex items-center gap-4">
              <div className="avatar">
                <div className="w-16 rounded"><img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" alt="Avatar example" /></div>
              </div>
              <div className="avatar">
                <div className="w-16 rounded-full"><img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" alt="Avatar example" /></div>
              </div>
              <div className="avatar">
                <div className="w-16 mask mask-squircle"><img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" alt="Avatar example" /></div>
              </div>
              <div className="avatar">
                <div className="w-16 mask mask-hexagon"><img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" alt="Avatar example" /></div>
              </div>
            </div>
          </Section>

          <Section title="Avatar Placeholder">
            <div className="flex items-center gap-4">
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-12">
                  <span>MX</span>
                </div>
              </div>
              <div className="avatar online placeholder">
                <div className="bg-primary text-primary-content rounded-full w-12">
                  <span>AI</span>
                </div>
              </div>
              <div className="avatar offline placeholder">
                <div className="bg-secondary text-secondary-content rounded-full w-12">
                  <span>JD</span>
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== PROGRESS ===== */}
      {activeTab === 'progress' && (
        <div className="space-y-8">
          <Section title="Progress Colors">
            <div className="flex flex-col gap-2 w-full max-w-md">
              <progress className="progress w-full" value="10" max="100"></progress>
              <progress className="progress progress-primary w-full" value="25" max="100"></progress>
              <progress className="progress progress-secondary w-full" value="40" max="100"></progress>
              <progress className="progress progress-accent w-full" value="55" max="100"></progress>
              <progress className="progress progress-info w-full" value="70" max="100"></progress>
              <progress className="progress progress-success w-full" value="85" max="100"></progress>
              <progress className="progress progress-warning w-full" value="100" max="100"></progress>
              <progress className="progress progress-error w-full" value="100" max="100"></progress>
            </div>
          </Section>

          <Section title="Radial Progress">
            <div className="flex flex-wrap gap-4">
              <div className="radial-progress" style={{ '--value': 70 } as React.CSSProperties}>70%</div>
              <div className="radial-progress text-primary" style={{ '--value': 70 } as React.CSSProperties}>70%</div>
              <div className="radial-progress text-secondary" style={{ '--value': 70 } as React.CSSProperties}>70%</div>
              <div className="radial-progress text-accent" style={{ '--value': 70 } as React.CSSProperties}>70%</div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== LOADING ===== */}
      {activeTab === 'loading' && (
        <div className="space-y-8">
          <Section title="Loading Types">
            <div className="flex flex-wrap items-center gap-4">
              <span className="loading loading-spinner loading-xs"></span>
              <span className="loading loading-spinner loading-sm"></span>
              <span className="loading loading-spinner loading-md"></span>
              <span className="loading loading-spinner loading-lg"></span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="loading loading-dots loading-xs"></span>
              <span className="loading loading-dots loading-sm"></span>
              <span className="loading loading-dots loading-md"></span>
              <span className="loading loading-dots loading-lg"></span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="loading loading-ring loading-xs"></span>
              <span className="loading loading-ring loading-sm"></span>
              <span className="loading loading-ring loading-md"></span>
              <span className="loading loading-ring loading-lg"></span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="loading loading-ball loading-xs"></span>
              <span className="loading loading-ball loading-sm"></span>
              <span className="loading loading-ball loading-md"></span>
              <span className="loading loading-ball loading-lg"></span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="loading loading-bars loading-xs"></span>
              <span className="loading loading-bars loading-sm"></span>
              <span className="loading loading-bars loading-md"></span>
              <span className="loading loading-bars loading-lg"></span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="loading loading-infinity loading-xs"></span>
              <span className="loading loading-infinity loading-sm"></span>
              <span className="loading loading-infinity loading-md"></span>
              <span className="loading loading-infinity loading-lg"></span>
            </div>
          </Section>

          <Section title="Loading Colors">
            <div className="flex flex-wrap items-center gap-4">
              <span className="loading loading-spinner text-primary"></span>
              <span className="loading loading-spinner text-secondary"></span>
              <span className="loading loading-spinner text-accent"></span>
              <span className="loading loading-spinner text-neutral"></span>
              <span className="loading loading-spinner text-info"></span>
              <span className="loading loading-spinner text-success"></span>
              <span className="loading loading-spinner text-warning"></span>
              <span className="loading loading-spinner text-error"></span>
            </div>
          </Section>
        </div>
      )}

      {/* ===== TABLE ===== */}
      {activeTab === 'table' && (
        <div className="space-y-8">
          <Section title="Table">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Job</th>
                    <th>Favorite Color</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>1</th>
                    <td>Cy Ganderton</td>
                    <td>Quality Control Specialist</td>
                    <td>Blue</td>
                  </tr>
                  <tr className="hover">
                    <th>2</th>
                    <td>Hart Hagerty</td>
                    <td>Desktop Support Technician</td>
                    <td>Purple</td>
                  </tr>
                  <tr>
                    <th>3</th>
                    <td>Brice Swyre</td>
                    <td>Tax Accountant</td>
                    <td>Red</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Table Zebra">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Job</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><th>1</th><td>Alice</td><td>Developer</td></tr>
                  <tr><th>2</th><td>Bob</td><td>Designer</td></tr>
                  <tr><th>3</th><td>Charlie</td><td>Manager</td></tr>
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {/* ===== MENU ===== */}
      {activeTab === 'menu' && (
        <div className="space-y-8">
          <Section title="Menu">
            <ul className="menu bg-base-200 rounded-box w-56">
              <li><a>Item 1</a></li>
              <li><a>Item 2</a></li>
              <li><a>Item 3</a></li>
            </ul>
          </Section>

          <Section title="Menu with Icons">
            <ul className="menu bg-base-200 rounded-box w-56">
              <li>
                <a>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  Home
                </a>
              </li>
              <li>
                <a>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Details
                </a>
              </li>
              <li>
                <a>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Stats
                </a>
              </li>
            </ul>
          </Section>
        </div>
      )}

      {/* ===== COLLAPSE ===== */}
      {activeTab === 'collapse' && (
        <div className="space-y-8">
          <Section title="Collapse / Accordion">
            <div className="space-y-2">
              <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" defaultChecked />
                <div className="collapse-title text-xl font-medium">Click to open this one</div>
                <div className="collapse-content"><p>Content for the first section.</p></div>
              </div>
              <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" />
                <div className="collapse-title text-xl font-medium">Click to open this one</div>
                <div className="collapse-content"><p>Content for the second section.</p></div>
              </div>
              <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" />
                <div className="collapse-title text-xl font-medium">Click to open this one</div>
                <div className="collapse-content"><p>Content for the third section.</p></div>
              </div>
            </div>
          </Section>

          <Section title="Collapse Plus/Minus">
            <div className="collapse collapse-plus bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-xl font-medium">Click me to show/hide content</div>
              <div className="collapse-content"><p>Hidden content revealed!</p></div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== SKELETON ===== */}
      {activeTab === 'skeleton' && (
        <div className="space-y-8">
          <Section title="Skeleton Loading States">
            <div className="flex flex-col gap-4 w-full">
              <div className="skeleton h-4 w-full"></div>
              <div className="skeleton h-4 w-3/4"></div>
              <div className="skeleton h-4 w-1/2"></div>
            </div>
          </Section>

          <Section title="Card Skeleton">
            <div className="flex flex-col gap-4 w-52">
              <div className="skeleton h-32 w-full"></div>
              <div className="skeleton h-4 w-28"></div>
              <div className="skeleton h-4 w-full"></div>
              <div className="skeleton h-4 w-full"></div>
            </div>
          </Section>

          <Section title="Avatar Skeleton">
            <div className="flex gap-4 items-center">
              <div className="skeleton h-16 w-16 shrink-0 rounded-full"></div>
              <div className="flex flex-col gap-2">
                <div className="skeleton h-4 w-20"></div>
                <div className="skeleton h-4 w-28"></div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== BREADCRUMBS ===== */}
      {activeTab === 'breadcrumbs' && (
        <div className="space-y-8">
          <Section title="Basic Breadcrumbs">
            <div className="breadcrumbs text-sm">
              <ul>
                <li><a>Home</a></li>
                <li><a>Documents</a></li>
                <li>Add Document</li>
              </ul>
            </div>
          </Section>

          <Section title="With Icons">
            <div className="breadcrumbs text-sm">
              <ul>
                <li>
                  <a>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 mr-2 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                    Home
                  </a>
                </li>
                <li>
                  <a>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 mr-2 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Documents
                  </a>
                </li>
                <li>Add Document</li>
              </ul>
            </div>
          </Section>
        </div>
      )}

      {/* ===== TEXTAREA ===== */}
      {activeTab === 'textarea' && (
        <div className="space-y-8">
          <Section title="Basic Textarea">
            <textarea className="textarea textarea-bordered w-full max-w-md" placeholder="Type something..."></textarea>
          </Section>

          <Section title="Textarea Variants">
            <div className="flex flex-col gap-4 max-w-md">
              <textarea className="textarea textarea-primary" placeholder="Primary"></textarea>
              <textarea className="textarea textarea-secondary" placeholder="Secondary"></textarea>
              <textarea className="textarea textarea-accent" placeholder="Accent"></textarea>
              <textarea className="textarea textarea-info" placeholder="Info"></textarea>
              <textarea className="textarea textarea-success" placeholder="Success"></textarea>
              <textarea className="textarea textarea-warning" placeholder="Warning"></textarea>
              <textarea className="textarea textarea-error" placeholder="Error"></textarea>
            </div>
          </Section>

          <Section title="Textarea Sizes">
            <div className="flex flex-col gap-4 max-w-md">
              <textarea className="textarea textarea-bordered textarea-xs" placeholder="Extra small"></textarea>
              <textarea className="textarea textarea-bordered textarea-sm" placeholder="Small"></textarea>
              <textarea className="textarea textarea-bordered textarea-md" placeholder="Medium"></textarea>
              <textarea className="textarea textarea-bordered textarea-lg" placeholder="Large"></textarea>
            </div>
          </Section>
        </div>
      )}

      {/* ===== FILE INPUT ===== */}
      {activeTab === 'file-input' && (
        <div className="space-y-8">
          <Section title="Basic File Input">
            <input type="file" className="file-input file-input-bordered w-full max-w-xs" />
          </Section>

          <Section title="File Input Variants">
            <div className="flex flex-col gap-4 max-w-xs">
              <input type="file" className="file-input file-input-bordered file-input-primary" />
              <input type="file" className="file-input file-input-bordered file-input-secondary" />
              <input type="file" className="file-input file-input-bordered file-input-accent" />
              <input type="file" className="file-input file-input-bordered file-input-info" />
              <input type="file" className="file-input file-input-bordered file-input-success" />
              <input type="file" className="file-input file-input-bordered file-input-warning" />
              <input type="file" className="file-input file-input-bordered file-input-error" />
            </div>
          </Section>

          <Section title="File Input Sizes">
            <div className="flex flex-col gap-4 max-w-xs">
              <input type="file" className="file-input file-input-bordered file-input-xs" />
              <input type="file" className="file-input file-input-bordered file-input-sm" />
              <input type="file" className="file-input file-input-bordered file-input-md" />
              <input type="file" className="file-input file-input-bordered file-input-lg" />
            </div>
          </Section>
        </div>
      )}

      {/* ===== STEPS ===== */}
      {activeTab === 'steps' && (
        <div className="space-y-8">
          <Section title="Basic Steps">
            <ul className="steps">
              <li className="step step-primary">Register</li>
              <li className="step step-primary">Choose plan</li>
              <li className="step">Purchase</li>
              <li className="step">Receive Product</li>
            </ul>
          </Section>

          <Section title="Vertical Steps">
            <ul className="steps steps-vertical">
              <li className="step step-primary">Register</li>
              <li className="step step-primary">Choose plan</li>
              <li className="step">Purchase</li>
              <li className="step">Receive Product</li>
            </ul>
          </Section>

          <Section title="Steps with Custom Content">
            <ul className="steps">
              <li className="step step-info" data-content="?">Step 1</li>
              <li className="step step-info" data-content="!">Step 2</li>
              <li className="step step-info" data-content="✓">Step 3</li>
              <li className="step step-info" data-content="✕">Step 4</li>
              <li className="step step-info" data-content="★">Step 5</li>
            </ul>
          </Section>
        </div>
      )}

      {/* ===== STAT ===== */}
      {activeTab === 'stat' && (
        <div className="space-y-8">
          <Section title="Basic Stats">
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-title">Total Page Views</div>
                <div className="stat-value">89,400</div>
                <div className="stat-desc">21% more than last month</div>
              </div>
            </div>
          </Section>

          <Section title="Stats with Icons">
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </div>
                <div className="stat-title">Total Likes</div>
                <div className="stat-value text-primary">25.6K</div>
                <div className="stat-desc">21% more than last month</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div className="stat-title">Page Views</div>
                <div className="stat-value text-secondary">2.6M</div>
                <div className="stat-desc">21% more than last month</div>
              </div>
            </div>
          </Section>

          <Section title="Stats with Avatar">
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-figure text-secondary">
                  <div className="avatar online">
                    <div className="w-16 rounded-full">
                      <div className="bg-primary text-primary-content rounded-full w-full h-full flex items-center justify-center text-xl font-bold">AI</div>
                    </div>
                  </div>
                </div>
                <div className="stat-value">86%</div>
                <div className="stat-title">Tasks done</div>
                <div className="stat-desc text-secondary">31 tasks remaining</div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== CHAT ===== */}
      {activeTab === 'chat' && (
        <div className="space-y-8">
          <Section title="Chat Bubbles">
            <div className="space-y-2">
              <div className="chat chat-start">
                <div className="chat-image avatar">
                  <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center text-lg font-bold">U</div>
                </div>
                <div className="chat-header">User <time className="text-xs opacity-50">12:45</time></div>
                <div className="chat-bubble">Hello! How can I help you today?</div>
                <div className="chat-footer opacity-50">Delivered</div>
              </div>
              <div className="chat chat-end">
                <div className="chat-image avatar">
                  <div className="w-10 rounded-full bg-secondary text-secondary-content flex items-center justify-center text-lg font-bold">AI</div>
                </div>
                <div className="chat-header">Assistant <time className="text-xs opacity-50">12:46</time></div>
                <div className="chat-bubble chat-bubble-primary">Hello! I'm here to assist you with any questions.</div>
                <div className="chat-footer opacity-50">Seen at 12:46</div>
              </div>
            </div>
          </Section>

          <Section title="Chat Bubble Colors">
            <div className="space-y-2">
              <div className="chat chat-start"><div className="chat-bubble chat-bubble-primary">Primary</div></div>
              <div className="chat chat-start"><div className="chat-bubble chat-bubble-secondary">Secondary</div></div>
              <div className="chat chat-start"><div className="chat-bubble chat-bubble-accent">Accent</div></div>
              <div className="chat chat-start"><div className="chat-bubble chat-bubble-info">Info</div></div>
              <div className="chat chat-start"><div className="chat-bubble chat-bubble-success">Success</div></div>
              <div className="chat chat-start"><div className="chat-bubble chat-bubble-warning">Warning</div></div>
              <div className="chat chat-start"><div className="chat-bubble chat-bubble-error">Error</div></div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== TIMELINE ===== */}
      {activeTab === 'timeline' && (
        <div className="space-y-8">
          <Section title="Basic Timeline">
            <ul className="timeline">
              <li>
                <div className="timeline-start">1984</div>
                <div className="timeline-middle">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                </div>
                <div className="timeline-end timeline-box">First Mac computer</div>
                <hr className="bg-primary" />
              </li>
              <li>
                <hr className="bg-primary" />
                <div className="timeline-start">1998</div>
                <div className="timeline-middle">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                </div>
                <div className="timeline-end timeline-box">iMac</div>
                <hr />
              </li>
              <li>
                <hr />
                <div className="timeline-start">2007</div>
                <div className="timeline-middle">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                </div>
                <div className="timeline-end timeline-box">iPhone</div>
              </li>
            </ul>
          </Section>

          <Section title="Vertical Timeline">
            <ul className="timeline timeline-vertical">
              <li>
                <div className="timeline-start timeline-box">Start project</div>
                <div className="timeline-middle">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-success"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                </div>
                <hr className="bg-success" />
              </li>
              <li>
                <hr className="bg-success" />
                <div className="timeline-middle">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-success"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                </div>
                <div className="timeline-end timeline-box">In progress</div>
                <hr />
              </li>
              <li>
                <hr />
                <div className="timeline-start timeline-box">Complete</div>
                <div className="timeline-middle">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                </div>
              </li>
            </ul>
          </Section>
        </div>
      )}

      {/* ===== CAROUSEL ===== */}
      {activeTab === 'carousel' && (
        <div className="space-y-8">
          <Section title="Basic Carousel">
            <div className="carousel rounded-box w-full max-w-md">
              <div className="carousel-item w-full">
                <div className="bg-primary text-primary-content w-full h-48 flex items-center justify-center text-2xl font-bold">Slide 1</div>
              </div>
              <div className="carousel-item w-full">
                <div className="bg-secondary text-secondary-content w-full h-48 flex items-center justify-center text-2xl font-bold">Slide 2</div>
              </div>
              <div className="carousel-item w-full">
                <div className="bg-accent text-accent-content w-full h-48 flex items-center justify-center text-2xl font-bold">Slide 3</div>
              </div>
            </div>
          </Section>

          <Section title="Carousel with Half Width">
            <div className="carousel carousel-center rounded-box max-w-md space-x-4 bg-neutral p-4">
              <div className="carousel-item">
                <div className="bg-primary text-primary-content w-32 h-32 rounded-lg flex items-center justify-center font-bold">1</div>
              </div>
              <div className="carousel-item">
                <div className="bg-secondary text-secondary-content w-32 h-32 rounded-lg flex items-center justify-center font-bold">2</div>
              </div>
              <div className="carousel-item">
                <div className="bg-accent text-accent-content w-32 h-32 rounded-lg flex items-center justify-center font-bold">3</div>
              </div>
              <div className="carousel-item">
                <div className="bg-info text-info-content w-32 h-32 rounded-lg flex items-center justify-center font-bold">4</div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ===== TOAST ===== */}
      {activeTab === 'toast' && (
        <div className="space-y-8">
          <Section title="Toast Positions">
            <div className="relative h-64 bg-base-200 rounded-lg overflow-hidden">
              <div className="toast toast-top toast-start">
                <div className="alert alert-info"><span>Top Start</span></div>
              </div>
              <div className="toast toast-top toast-center">
                <div className="alert alert-success"><span>Top Center</span></div>
              </div>
              <div className="toast toast-top toast-end">
                <div className="alert alert-warning"><span>Top End</span></div>
              </div>
            </div>
          </Section>

          <Section title="Toast with Multiple Alerts">
            <div className="relative h-48 bg-base-200 rounded-lg overflow-hidden">
              <div className="toast toast-end">
                <div className="alert alert-info"><span>New message arrived</span></div>
                <div className="alert alert-success"><span>File uploaded</span></div>
                <div className="alert alert-error"><span>Connection failed</span></div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Hello!</h3>
            <p className="py-4">This is a DaisyUI modal dialog.</p>
            <div className="modal-action">
              <button className="btn" onClick={() => setModalOpen(false)}>Close</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setModalOpen(false)}>
            <button>close</button>
          </form>
        </dialog>
      )}
      {/* ===== TIMELINE ===== */}
      {activeTab === 'timeline' && (
        <div className="space-y-8">
          <Section title="Bot Chat Timeline (Vertical Steps)">
            <BotChatTimeline />
          </Section>
        </div>
      )}
    </div>
  );
};

// Helper Section component
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="card bg-base-100 border border-base-300">
    <div className="card-body">
      <h3 className="card-title text-lg">{title}</h3>
      {children}
    </div>
  </div>
);

export default DaisyUIShowcase;
