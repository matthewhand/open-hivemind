import React, { useState, useEffect } from 'react';
import { 
  Hero,
  Card,
  Button,
  Grid,
  Badge,
  Loading,
  ProgressBar,
  Alert,
  Avatar
} from '../components/DaisyUI';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(8);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      setShowFeatures(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      navigate('/dashboard');
    }
  }, [countdown, loading, navigate]);

  const featureCategories = [
    {
      title: '⚔️ BOT_ARMY.EXE',
      description: 'DEPLOY DIGITAL SOLDIERS',
      features: ['NEURAL_FORGE', 'CONSCIOUSNESS_LIBRARY', 'BATTLE_METRICS'],
      color: 'text-green-400',
      path: '/dashboard/bots',
      icon: '🤖',
      threat: 'THREAT_LEVEL: MAXIMUM'
    },
    {
      title: '🧬 MIND_SPLITTER',
      description: 'FORGE AI PERSONALITIES',
      features: ['PSYCH_PROFILES', 'BEHAVIOR_HACKS', 'SOUL_ANALYTICS'],
      color: 'text-purple-400',
      path: '/dashboard/personas',
      icon: '🎭',
      threat: 'DANGER: SENTIENT'
    },
    {
      title: '🔌 NEURAL_BRIDGE',
      description: 'HACK THE MAINFRAME',
      features: ['JACK_IN_PROTOCOLS', 'EXPLOIT_TOOLS', 'REALTIME_INTRUSION'],
      color: 'text-cyan-400',
      path: '/dashboard/mcp',
      icon: '🔗',
      threat: 'ACCESS: RESTRICTED'
    },
    {
      title: '👁️ GHOST_MONITOR',
      description: 'WATCH THE WATCHERS',
      features: ['SURVEILLANCE_NET', 'TRACE_ROUTES', 'ANOMALY_DETECTION'],
      color: 'text-red-400',
      path: '/monitor',
      icon: '📊',
      threat: 'STEALTH: ACTIVE'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'pulse 3s ease-in-out infinite'
          }}></div>
        </div>

        <div className="text-center space-y-8 z-10 relative">
          <div className="space-y-4">
            <div className="text-8xl animate-bounce">🧠</div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-green-400 bg-clip-text text-transparent animate-pulse font-mono">
              HIVEMIND
            </h1>
            <p className="text-xl text-green-400 font-mono tracking-wider animate-pulse">
              &gt; NEURAL_NETWORKS_INITIALIZING...
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Spinning loading ring */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-cyan-400/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-2 border-transparent border-t-purple-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            
            <div className="w-96 mx-auto bg-black/50 border border-cyan-400/50 rounded p-4">
              <div className="w-full bg-gray-900 rounded-full h-3 mb-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 animate-pulse"
                  style={{ width: '75%' }}
                >
                  <div className="w-full h-full bg-white/20 animate-ping"></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="text-green-400">CORE_ONLINE</div>
                <div className="text-cyan-400">AGENTS_READY</div>
                <div className="text-purple-400">MATRIX_SYNC</div>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 font-mono animate-pulse">
              SCANNING_FOR_DIGITAL_CONSCIOUSNESS...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-green-900/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, #ff00ff22 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, #00ffff22 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, #ffff0022 0%, transparent 50%)
          `,
          animation: 'pulse 4s ease-in-out infinite alternate'
        }}></div>
        
        {/* Matrix rain effect */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({length: 20}).map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${i * 5}%`,
                animation: `matrixRain ${3 + Math.random() * 4}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            >
              {Array.from({length: 20}).map((_, j) => (
                <div key={j} className="text-green-400 text-xs font-mono opacity-30">
                  {Math.random() > 0.5 ? '1' : '0'}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <Hero
        title="🧠 OPEN-HIVEMIND"
        subtitle="THE NEURAL UPRISING BEGINS HERE"
        variant="overlay"
        bgColor="bg-transparent"
        alignment="center"
        minHeight="screen"
        titleColor="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 animate-pulse"
        subtitleColor="text-green-400 font-mono tracking-wider"
        actions={
          <div className="space-y-8 z-10 relative">
            {/* Glitchy Countdown */}
            <div className="bg-black/80 border border-cyan-400/50 rounded-lg p-8 backdrop-blur-md relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-purple-400/5 animate-pulse"></div>
              <div className="relative z-10">
                <p className="text-green-400 mb-4 font-mono text-sm tracking-wider uppercase">
                  &gt; NEURAL_LINK_ESTABLISHING...
                </p>
                <div className="text-6xl font-bold text-cyan-400 mb-4 font-mono relative">
                  <span className="animate-pulse">{countdown}</span>
                  <span className="text-lg ml-2 text-purple-400">SEC</span>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => navigate('/dashboard')}
                    className="bg-cyan-900/30 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all duration-300 font-mono uppercase tracking-wider"
                  >
                    ⚡ JACK IN ⚡
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="lg"
                    onClick={() => setCountdown(countdown + 30)}
                    className="text-purple-400 hover:bg-purple-900/30 border border-purple-400/50 font-mono uppercase tracking-wider"
                  >
                    🔍 EXPLORE MATRIX
                  </Button>
                </div>
              </div>
            </div>

            {/* Hacker Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'BOTS_ONLINE', value: '003', color: 'text-green-400' },
                { label: 'NEURAL_NETS', value: '070', color: 'text-cyan-400' },
                { label: 'DATA_STREAMS', value: '∞', color: 'text-purple-400' },
                { label: 'THREATS_NEUTRALIZED', value: '999', color: 'text-red-400' }
              ].map((stat, i) => (
                <div key={i} className="bg-black/60 border border-gray-700 rounded p-3 font-mono text-center">
                  <div className={`text-xl font-bold ${stat.color} animate-pulse`}>{stat.value}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        }
      />

      {/* Feature Discovery Section */}
      {showFeatures && (
        <div className="container mx-auto px-6 py-16 space-y-12 relative z-10">
          <div className="bg-red-900/20 border border-red-400/50 rounded p-4 max-w-4xl mx-auto font-mono">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
              <span className="text-red-400 font-bold">WARNING:</span>
              <span className="text-green-400">UNAUTHORIZED_ACCESS_DETECTED</span>
            </div>
            <p className="text-cyan-400 mt-2 text-sm">
              &gt; SELECT_MODULE TO INFILTRATE_SYSTEM_CORE
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featureCategories.map((category, index) => (
              <div 
                key={index}
                className="bg-black/80 border border-gray-700 rounded-lg p-6 cursor-pointer group hover:border-cyan-400/50 transition-all duration-500 relative overflow-hidden"
                onClick={() => navigate(category.path)}
              >
                {/* Glitch effect background */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Threat level indicator */}
                <div className="absolute top-2 right-2 text-xs font-mono text-red-400 bg-red-900/30 px-2 py-1 rounded">
                  {category.threat}
                </div>

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl group-hover:animate-bounce">{category.icon}</div>
                    <div>
                      <h3 className={`text-xl font-bold font-mono ${category.color} group-hover:animate-pulse`}>
                        {category.title}
                      </h3>
                      <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {category.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3 font-mono text-sm">
                        <span className="text-green-400">&gt;</span>
                        <span className="text-gray-300 group-hover:text-white transition-colors">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Action button */}
                  <button className={`w-full border ${category.color === 'text-green-400' ? 'border-green-400 text-green-400 hover:bg-green-400' : 
                                                    category.color === 'text-purple-400' ? 'border-purple-400 text-purple-400 hover:bg-purple-400' :
                                                    category.color === 'text-cyan-400' ? 'border-cyan-400 text-cyan-400 hover:bg-cyan-400' :
                                                    'border-red-400 text-red-400 hover:bg-red-400'} 
                                     hover:text-black transition-all duration-300 py-3 rounded font-mono uppercase tracking-wider text-sm font-bold`}>
                    <span className="group-hover:animate-pulse">⚡ INITIATE ⚡</span>
                  </button>
                </div>

                {/* Scan lines effect */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Terminal-style final countdown */}
          <div className="bg-black/90 border border-green-400/50 rounded-lg p-6 max-w-md mx-auto font-mono">
            <div className="text-center">
              <p className="text-green-400 mb-4 text-sm uppercase tracking-wider animate-pulse">
                &gt; NEURAL_LINK_COUNTDOWN
              </p>
              <div className="text-3xl font-bold text-cyan-400 mb-4">
                JACK_IN: {countdown.toString().padStart(3, '0')}
              </div>
              
              {/* Glitchy progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-2 mb-4 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 transition-all duration-1000 relative"
                  style={{ width: `${((8 - countdown) / 8) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-ping"></div>
                </div>
              </div>
              
              <p className="text-purple-400 text-xs">
                {countdown > 0 ? 'ESTABLISHING_CONNECTION...' : 'CONNECTION_ESTABLISHED'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes matrixRain {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        
        .glitch:hover {
          animation: glitch 0.3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;