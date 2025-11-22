import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectDashboard } from '../store/slices/dashboardSlice';
import { AnimatedBox } from '../animations/AnimationComponents';

interface CSS3DNetworkProps {
  width?: number;
  height?: number;
  showLabels?: boolean;
  autoRotate?: boolean;
}

interface Connection {
  from: string;
  to: string;
  strength: number;
  latency: number;
}

export const CSS3DNetwork: React.FC<CSS3DNetworkProps> = ({
  width = 800,
  height = 600,
  showLabels = true,
  autoRotate = false,
}) => {
  const { bots } = useAppSelector(selectDashboard);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [nodeScale, setNodeScale] = useState(1);
  const [viewMode, setViewMode] = useState<'sphere' | 'grid' | 'tree'>('sphere');
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Generate 3D positions for nodes
  const generatePositions = () => {
    const positions = new Map<string, { x: number; y: number; z: number }>();

    bots.forEach((bot, index) => {
      let position;

      switch (viewMode) {
        case 'sphere': {
          const phi = Math.acos(-1 + (2 * Math.random()));
          const theta = Math.random() * Math.PI * 2;
          const radius = 150 + Math.random() * 50;

          position = {
            x: radius * Math.sin(phi) * Math.cos(theta),
            y: radius * Math.sin(phi) * Math.sin(theta),
            z: radius * Math.cos(phi),
          };
          break;
        }
        case 'grid': {
          const gridSize = Math.ceil(Math.sqrt(bots.length));
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;

          position = {
            x: (col - gridSize / 2) * 60,
            y: (row - gridSize / 2) * 60,
            z: 0,
          };
          break;
        }
        case 'tree': {
          const level = Math.floor(Math.random() * 3);
          const angle = (index / bots.length) * Math.PI * 2;
          const radius = level * 80 + 60;

          position = {
            x: Math.cos(angle) * radius,
            y: -level * 80,
            z: Math.sin(angle) * radius,
          };
          break;
        }
        default: {
          position = { x: 0, y: 0, z: 0 };
        }
      }

      positions.set(bot.name, position);
    });

    return positions;
  };

  const positions = generatePositions();

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      setRotation(prev => ({
        x: prev.x + rotationSpeed * 0.1,
        y: prev.y + rotationSpeed * 0.2,
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [autoRotate, rotationSpeed]);

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - lastMouse.x;
    const deltaY = event.clientY - lastMouse.y;

    setRotation(prev => ({
      x: prev.x + deltaY * 0.5,
      y: prev.y + deltaX * 0.5,
    }));

    setLastMouse({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'connecting': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#757575';
    }
  };

  const getNodeSize = (status: string) => {
    switch (status) {
      case 'active': return 20 * nodeScale;
      case 'connecting': return 15 * nodeScale;
      case 'error': return 12 * nodeScale;
      default: return 10 * nodeScale;
    }
  };

  const getConnectionColor = (strength: number) => {
    if (strength > 0.7) return '#4caf50';
    if (strength > 0.4) return '#ff9800';
    return '#f44336';
  };

  // Generate connections
  const connections: Connection[] = [];
  bots.forEach((bot, i) => {
    if (i < bots.length - 1 && bot.status === 'active') {
      connections.push({
        from: bot.name,
        to: bots[i + 1]?.name || bots[0]?.name,
        strength: Math.random(),
        latency: Math.random() * 100,
      });
    }
  });

  return (
    <AnimatedBox
      animation={{ initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 } }}
      sx={{ width, height, position: 'relative', overflow: 'hidden' }}
    >
      {/* Controls Panel */}
      <div className="absolute top-4 right-4 z-50 bg-base-100 rounded-box p-4 shadow-xl max-w-xs border border-base-200">
        <h3 className="font-bold mb-2">
          Network Visualization
        </h3>

        {/* View Mode */}
        <div className="mb-4">
          <p className="text-xs mb-1">View Mode:</p>
          <div className="flex gap-1 flex-wrap">
            {(['sphere', 'grid', 'tree'] as const).map((mode) => (
              <div
                key={mode}
                className={`badge cursor-pointer ${viewMode === mode ? 'badge-primary' : 'badge-ghost'}`}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </div>
            ))}
          </div>
        </div>

        {/* Rotation Speed */}
        <div className="mb-4">
          <p className="text-xs mb-1">Rotation Speed: {rotationSpeed.toFixed(1)}x</p>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={rotationSpeed * 10}
            onChange={(e) => setRotationSpeed(Number(e.target.value) / 10)}
            className="range range-xs range-primary"
          />
        </div>

        {/* Node Scale */}
        <div className="mb-4">
          <p className="text-xs mb-1">Node Scale: {nodeScale.toFixed(1)}x</p>
          <input
            type="range"
            min="5"
            max="20"
            step="0.5"
            value={nodeScale * 10}
            onChange={(e) => setNodeScale(Number(e.target.value) / 10)}
            className="range range-xs range-primary"
          />
        </div>

        {/* Stats */}
        <div className="mt-2 pt-2 border-t border-base-200 text-xs space-y-1">
          <p>Active Bots: {bots.filter(b => b.status === 'active').length}</p>
          <p>Total Bots: {bots.length}</p>
        </div>
      </div>

      {/* 3D Scene Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          perspective: '1000px',
          cursor: isDragging ? 'grabbing' : 'grab',
          background: 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Starfield Background */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              radial-gradient(2px 2px at 20px 30px, #eee, transparent),
              radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 90px 40px, #fff, transparent),
              radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
              radial-gradient(2px 2px at 160px 30px, #ddd, transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '200px 100px',
            animation: 'twinkle 3s ease-in-out infinite alternate',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
          }}
        />
        <style>{`
          @keyframes twinkle {
            0% { opacity: 0.8; }
            100% { opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.9; }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px currentColor; }
            50% { box-shadow: 0 0 40px currentColor; }
          }
        `}</style>

        {/* Connections */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {connections.map((connection, index) => {
            const fromPos = positions.get(connection.from);
            const toPos = positions.get(connection.to);

            if (!fromPos || !toPos) return null;

            const midX = (fromPos.x + toPos.x) / 2 + width / 2;
            const midY = (fromPos.y + toPos.y) / 2 + height / 2;
            const midZ = (fromPos.z + toPos.z) / 2;

            const length = Math.sqrt(
              Math.pow(toPos.x - fromPos.x, 2) +
              Math.pow(toPos.y - fromPos.y, 2) +
              Math.pow(toPos.z - fromPos.z, 2)
            );

            const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x) * 180 / Math.PI;

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: midX,
                  top: midY,
                  width: length,
                  height: 2,
                  backgroundColor: getConnectionColor(connection.strength),
                  opacity: 0.6,
                  borderRadius: 1,
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateZ(${midZ}px)`,
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            );
          })}
        </div>

        {/* Bot Nodes */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {bots.map((bot) => {
            const position = positions.get(bot.name);
            if (!position) return null;

            const x = position.x + width / 2;
            const y = position.y + height / 2;
            const z = position.z;
            const color = getNodeColor(bot.status);

            return (
              <div
                key={bot.name}
                className="tooltip"
                data-tip={`${bot.name} - ${bot.status}`}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) translateZ(${z}px)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div
                  style={{
                    width: getNodeSize(bot.status),
                    height: getNodeSize(bot.status),
                    backgroundColor: color,
                    borderRadius: '50%',
                    boxShadow: `0 0 20px ${color}80`,
                    animation: bot.status === 'active' ? 'glow 2s ease-in-out infinite' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    color: color, // for currentColor in keyframes
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
                {showLabels && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translate(-50%, 8px)',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    {bot.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedBox>
  );
};

export default CSS3DNetwork;