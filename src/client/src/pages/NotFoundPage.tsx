import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '../components/DaisyUI/Hero';
import { Button } from '../components/DaisyUI/Button';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center text-center">
      <Hero minHeight="screen" bgColor="bg-base-200">
        <div className="max-w-md">
           <div className="mb-8 text-9xl font-black opacity-10 font-mono select-none">
            404
          </div>
          <h1 className="text-5xl font-bold text-primary">Signal Lost</h1>
          <p className="py-6 text-base-content/70">
            The page you are looking for has been disconnected from the matrix. Our bots have searched everywhere, but this coordinate is empty.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              variant="primary"
              onClick={() => navigate('/')}
            >
              Return to Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </div>
        </div>
      </Hero>
    </div>
  );
};

export default NotFoundPage;
