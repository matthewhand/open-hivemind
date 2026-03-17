import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Progress, Alert } from '../components/DaisyUI';
import {
  SparklesIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export interface SimpleAnimation {
  id: string;
  name: string;
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce';
  duration: number;
  isActive: boolean;
}

const animations: SimpleAnimation[] = [
  { id: '1', name: 'Fade In', type: 'fade', duration: 500, isActive: false },
  { id: '2', name: 'Slide Right', type: 'slide', duration: 300, isActive: false },
  { id: '3', name: 'Scale Up', type: 'scale', duration: 200, isActive: false },
  { id: '4', name: 'Rotate', type: 'rotate', duration: 1000, isActive: false },
  { id: '5', name: 'Bounce', type: 'bounce', duration: 800, isActive: false },
];

export const AnimatedBox: React.FC<{
  children: React.ReactNode;
  animation?: string;
  duration?: number;
}> = ({ children, animation = 'fade-in', duration = 300 }) => {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div
      className={`transition-all ${animation} ${
        isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
      }`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};

const AnimationComponents: React.FC = () => {
  const [activeAnimations, setActiveAnimations] = useState<SimpleAnimation[]>(animations);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDemo, setCurrentDemo] = useState<string>('fade-in');

  const toggleAnimation = (id: string) => {
    setActiveAnimations(prev =>
      prev.map(anim =>
        anim.id === id ? { ...anim, isActive: !anim.isActive } : anim,
      ),
    );
  };

  const playAll = () => {
    setIsPlaying(true);
    setActiveAnimations(animations.map(anim => ({ ...anim, isActive: true })));

    setTimeout(() => {
      setIsPlaying(false);
      setActiveAnimations(animations.map(anim => ({ ...anim, isActive: false })));
    }, 1200);
  };

  const stopAll = () => {
    setIsPlaying(false);
    setActiveAnimations(animations.map(anim => ({ ...anim, isActive: false })));
  };

  const demoAnimations = [
    { id: 'fade-in', name: 'Fade In', className: 'animate-fade-in' },
    { id: 'slide-in', name: 'Slide In', className: 'animate-slide-in' },
    { id: 'bounce', name: 'Bounce', className: 'animate-bounce' },
    { id: 'spin', name: 'Spin', className: 'animate-spin' },
    { id: 'pulse', name: 'Pulse', className: 'animate-pulse' },
  ];

  const activeCount = activeAnimations.filter(a => a.isActive).length;

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-secondary">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SparklesIcon className="w-8 h-8 text-secondary" />
              <div>
                <h2 className="card-title text-2xl">Animation Components</h2>
                <p className="text-sm opacity-70">Simple animation utilities and effects</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isPlaying ? 'success' : 'neutral'} size="lg">
                {isPlaying ? 'Playing' : 'Ready'}
              </Badge>
              <Badge variant="info" size="lg">
                {activeCount}/{animations.length} Active
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow">
          <div className="card-body">
            <h3 className="font-bold mb-4">Animation Controls</h3>
            <div className="flex gap-2">
              <Button onClick={playAll} className="btn-success">
                <PlayIcon className="w-4 h-4 mr-2" />
                Play All
              </Button>
              <Button onClick={stopAll} className="btn-error">
                <PauseIcon className="w-4 h-4 mr-2" />
                Stop All
              </Button>
              <Button onClick={() => {
                const shuffled = animations.map(a => ({
                  ...a,
                  isActive: Math.random() > 0.5,
                }));
                setActiveAnimations(shuffled);
              }} className="btn-warning">
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Random
              </Button>
            </div>
          </div>
        </Card>

        <Card className="shadow">
          <div className="card-body">
            <h3 className="font-bold mb-2">Active Animations</h3>
            <div className="flex items-center gap-2">
              <Progress
                value={(activeCount / animations.length) * 100}
                max={100}
                className="flex-1"
              />
              <span className="text-sm">{activeCount}/{animations.length}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Animation List */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Available Animations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAnimations.map((animation) => (
              <div
                key={animation.id}
                className={`border rounded-lg p-4 transition-all ${
                  animation.isActive ? 'border-primary bg-primary/10' : 'border-base-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{animation.name}</h4>
                  <Badge
                    variant={animation.isActive ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {animation.type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-70">{animation.duration}ms</span>
                  <Button
                    size="sm"
                    className={`btn-${animation.isActive ? 'error' : 'primary'}`}
                    onClick={() => toggleAnimation(animation.id)}
                  >
                    {animation.isActive ? 'Stop' : 'Start'}
                  </Button>
                </div>
                {animation.isActive && (
                  <div className="mt-2">
                    <div className="w-4 h-4 bg-primary rounded-full animate-ping"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Demo Section */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Animation Demo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Select Animation:</h4>
              <div className="flex flex-wrap gap-2">
                {demoAnimations.map((demo) => (
                  <Button
                    key={demo.id}
                    size="sm"
                    className={`btn-${currentDemo === demo.id ? 'primary' : 'ghost'}`}
                    onClick={() => setCurrentDemo(demo.id)}
                  >
                    {demo.name}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Preview:</h4>
              <div className="border border-base-300 rounded-lg p-8 bg-base-100">
                <AnimatedBox animation={currentDemo} duration={1000}>
                  <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-8 h-8 text-primary-content" />
                  </div>
                </AnimatedBox>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isPlaying && (
        <Alert variant="success" className="flex items-center gap-3">
          <SparklesIcon className="w-5 h-5 animate-spin" />
          <div>
            <p className="font-medium">Animations playing</p>
            <p className="text-sm opacity-70">All animation effects are currently active</p>
          </div>
        </Alert>
      )}

      <Alert variant="info" className="flex items-center gap-3">
        <SparklesIcon className="w-5 h-5" />
        <div>
          <p className="font-medium">Simple animation utilities</p>
          <p className="text-sm opacity-70">Lightweight animations without external dependencies</p>
        </div>
      </Alert>
    </div>
  );
};

export default AnimationComponents;