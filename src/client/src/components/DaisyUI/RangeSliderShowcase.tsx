import React from 'react';
import { createRoot } from 'react-dom/client';
import RangeSlider from './RangeSlider';
import './index.css';

const App = () => {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-12">
      <h1 className="text-3xl font-bold">RangeSlider Showcase</h1>

      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">Basic Sliders (System Management)</h2>
        <RangeSlider
          label="CPU Usage Threshold"
          value={80}
          min={0}
          max={100}
          step={5}
          valueFormatter={(v) => `${v}%`}
          variant="warning"
        />
        <RangeSlider
          label="Memory Usage Threshold"
          value={85}
          min={0}
          max={100}
          step={5}
          valueFormatter={(v) => `${v}%`}
          variant="warning"
        />
        <RangeSlider
          label="Disk Usage Threshold"
          value={90}
          min={0}
          max={100}
          step={5}
          valueFormatter={(v) => `${v}%`}
          variant="warning"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">Guards Page</h2>

        <RangeSlider
          label="Max Requests"
          value={100}
          min={1}
          max={1000}
          step={1}
          variant="primary"
        />

        <div className="pt-4">
          <RangeSlider
            label="Strictness"
            value={2}
            min={1}
            max={3}
            step={1}
            variant="error"
            showMarks={true}
            showValue={false}
            marks={[
              { value: 1, label: 'Low' },
              { value: 2, label: 'Medium' },
              { value: 3, label: 'High' }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
