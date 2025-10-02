import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="card w-96 bg-base-100 shadow-2xl">
        <div className="card-body">
          <h2 className="card-title text-primary">🧠 Open-Hivemind</h2>
          <p className="text-base-content">
            If you can see this beautiful card with proper styling, then 
            <strong className="text-accent"> Tailwind CSS and DaisyUI are working!</strong>
          </p>
          
          <div className="grid grid-cols-3 gap-2 my-4">
            <button className="btn btn-primary btn-sm">Primary</button>
            <button className="btn btn-secondary btn-sm">Secondary</button>
            <button className="btn btn-accent btn-sm">Accent</button>
          </div>
          
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>✨ Cyberpunk theme active!</span>
          </div>
          
          <div className="stats shadow bg-base-200 mt-4">
            <div className="stat place-items-center">
              <div className="stat-title">Status</div>
              <div className="stat-value text-primary">ONLINE</div>
              <div className="stat-desc">All systems go</div>
            </div>
          </div>
          
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-primary">
              🚀 Launch Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;