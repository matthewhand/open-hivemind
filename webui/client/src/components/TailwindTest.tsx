import React from 'react';

const TailwindTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="card w-96 bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary">🎨 Tailwind + DaisyUI Test</h2>
          <p className="text-base-content">If you can see this styled card, Tailwind and DaisyUI are working!</p>
          
          <div className="grid grid-cols-3 gap-2 my-4">
            <div className="btn btn-primary btn-sm">Primary</div>
            <div className="btn btn-secondary btn-sm">Secondary</div>
            <div className="btn btn-accent btn-sm">Accent</div>
          </div>
          
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Success! Tailwind CSS is working.</span>
          </div>
          
          <div className="card-actions justify-end">
            <button className="btn btn-primary">Awesome!</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindTest;