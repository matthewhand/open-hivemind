import React from 'react';
import { Section } from './Section';

export const InputDemo: React.FC = () => {
  return (
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
  );
};

export const SelectDemo: React.FC = () => {
  return (
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
  );
};

export const CheckboxDemo: React.FC = () => {
  return (
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
  );
};

export const TextareaDemo: React.FC = () => {
  return (
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
  );
};

export const FileInputDemo: React.FC = () => {
  return (
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
  );
};
