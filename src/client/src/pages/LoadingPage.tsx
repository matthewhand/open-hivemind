import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const LoadingPage: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 3000; // 3 seconds
    const intervalDuration = 100; // Update every 100ms
    const totalSteps = totalDuration / intervalDuration;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / totalSteps);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            navigate('/admin/overview');
          }, 200); // Small delay after reaching 100%
          return 100;
        }
        return next;
      });
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="container mx-auto max-w-md min-h-screen flex flex-col justify-center items-center text-center gap-8">
      <h1 className="text-5xl font-bold">
        Open-Hivemind
      </h1>

      <h2 className="text-xl text-base-content/70">
        Initializing AI Network Dashboard
      </h2>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <LoadingSpinner size="lg" variant="infinity" />

        <div className="w-full">
          <div className="w-full bg-base-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-base-content/70 mt-2">
            {Math.round(progress)}% Complete
          </p>
        </div>
      </div>

      <p className="text-sm text-base-content/70">
        Preparing your intelligent workspace...
      </p>
    </div>
  );
};

export default LoadingPage;