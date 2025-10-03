import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Slider, Chip } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { selectDashboard } from '../store/slices/dashboardSlice';
import { AnimatedBox } from '../animations/AnimationComponents';

interface BotNode {
  id: string;
  name: string;
  status: 'active' | 'connecting' | 'error';
  position: THREE.Vector3;
  connections: string[];
  metrics: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

interface Connection {
  from: string;
  to: string;
  strength: number;
  latency: number;
}

interface ThreeJSNetworkProps {
  width?: number;
  height?: number;
  showLabels?: boolean;
  autoRotate?: boolean;
  particleEffects?: boolean;
}

export const ThreeJSNetwork: React.FC<ThreeJSNetworkProps> = ({
  width = 800,
  height = 600,
  showLabels = true,
  autoRotate = false,
  particleEffects = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const nodesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const connectionsRef = useRef<Map<string, THREE.Line>>(new Map());
  const particlesRef = useRef<THREE.Points | null>(null);

  const { bots } = useAppSelector(selectDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.001);
  const [connectionOpacity, setConnectionOpacity] = useState(0.6);
  const [nodeScale, setNodeScale] = useState(1);
  const [viewMode, setViewMode] = useState<'sphere' | 'grid' | 'tree'>('sphere');

  const createBotNode = useCallback((bot: BotNode): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(0.5 * nodeScale, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: bot.status === 'active' ? 0x4caf50 : 
             bot.status === 'connecting' ? 0xff9800 : 0xf44336,
      emissive: bot.status === 'active' ? 0x1b5e20 : 
                bot.status === 'connecting' ? 0xe65100 : 0xb71c1c,
      emissiveIntensity: 0.3,
      shininess: 100,
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // Position based on view mode
    switch (viewMode) {
      case 'sphere': {
        const phi = Math.acos(-1 + (2 * Math.random()));
        const theta = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 3;
        mesh.position.setFromSphericalCoords(radius, phi, theta);
        break;
      }
      case 'grid': {
        const index = parseInt(bot.id.split('_')[1]) || 0;
        const gridSize = Math.ceil(Math.sqrt(bots.length));
        mesh.position.set(
          (index % gridSize - gridSize / 2) * 2,
          Math.floor(index / gridSize - gridSize / 2) * 2,
          0
        );
        break;
      }
      case 'tree': {
        const level = Math.floor(Math.random() * 3);
        mesh.position.set(
          (Math.random() - 0.5) * level * 2,
          -level * 2,
          (Math.random() - 0.5) * level * 2
        );
        break;
      }
    }

    // Add pulsing animation for active bots
    if (bot.status === 'active') {
      const pulseGeometry = new THREE.RingGeometry(0.6 * nodeScale, 0.8 * nodeScale, 32);
      const pulseMaterial = new THREE.MeshBasicMaterial({
        color: 0x4caf50,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const pulseRing = new THREE.Mesh(pulseGeometry, pulseMaterial);
      pulseRing.position.copy(mesh.position);
      sceneRef.current?.add(pulseRing);

      // Animate pulse
      const animatePulse = () => {
        pulseRing.rotation.z += 0.02;
        pulseRing.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.1);
      };
      
      const pulseAnimation = () => {
        animatePulse();
        requestAnimationFrame(pulseAnimation);
      };
      pulseAnimation();
    }

    return mesh;
  }, [nodeScale, viewMode, bots.length]);

  const createConnection = useCallback((connection: Connection): THREE.Line => {
    const points = [];
    const fromNode = nodesRef.current.get(connection.from);
    const toNode = nodesRef.current.get(connection.to);

    if (fromNode && toNode) {
      points.push(fromNode.position);
      points.push(toNode.position);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: connection.strength > 0.7 ? 0x4caf50 : 
             connection.strength > 0.4 ? 0xff9800 : 0xf44336,
      transparent: true,
      opacity: connectionOpacity * connection.strength,
    });

    return new THREE.Line(geometry, material);
  }, [connectionOpacity]);

  const createParticleSystem = useCallback(() => {
    if (!particleEffects) return null;

    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Random positions in sphere
      const phi = Math.acos(-1 + (2 * Math.random()));
      const theta = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 10;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random colors
      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
    });

    return new THREE.Points(geometry, material);
  }, [particleEffects]);

  const updateNetwork = useCallback(() => {
    if (!sceneRef.current) return;

    // Clear existing nodes and connections
    nodesRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh);
    });
    connectionsRef.current.forEach((line) => {
      sceneRef.current?.remove(line);
    });

    nodesRef.current.clear();
    connectionsRef.current.clear();

    // Create bot nodes
    bots.forEach((bot, index) => {
      const botNode: BotNode = {
        id: bot.name,
        name: bot.name,
        status: bot.status as 'active' | 'connecting' | 'error',
        position: new THREE.Vector3(),
        connections: [],
        metrics: {
          responseTime: metrics.responseTime || Math.random() * 1000,
          memoryUsage: metrics.memoryUsage || Math.random() * 100,
          cpuUsage: metrics.cpuUsage || Math.random() * 100,
        },
      };

      const nodeMesh = createBotNode(botNode);
      sceneRef.current?.add(nodeMesh);
      nodesRef.current.set(botNode.id, nodeMesh);

      // Create connections between active bots
      if (bot.status === 'active' && index < bots.length - 1) {
        const connection: Connection = {
          from: bot.name,
          to: bots[index + 1]?.name || bots[0]?.name,
          strength: Math.random(),
          latency: Math.random() * 100,
        };

        const connectionLine = createConnection(connection);
        sceneRef.current?.add(connectionLine);
        connectionsRef.current.set(`${connection.from}-${connection.to}`, connectionLine);
      }
    });

    // Create particle system (simplified version without Three.js)
    // This would be implemented with actual Three.js when the library is available
    console.log('Particle system would be created here with Three.js');
  }, [bots, metrics, createBotNode, createConnection, createParticleSystem]);

  useEffect(() => {
    if (!mountRef.current || !labelMountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 15);

    // Renderers
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelMountRef.current.appendChild(labelRenderer.domElement);
    labelRendererRef.current = labelRenderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = rotationSpeed;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4caf50, 0.5, 100);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      controls.update();
      
      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.001;
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    animate();
    setIsLoading(false);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (labelMountRef.current && labelRenderer.domElement) {
        labelMountRef.current.removeChild(labelRenderer.domElement);
      }
      renderer.dispose();
      labelRenderer.dispose();
    };
  }, [width, height, autoRotate, rotationSpeed]);

  useEffect(() => {
    updateNetwork();
  }, [updateNetwork]);

  const handleViewModeChange = (mode: 'sphere' | 'grid' | 'tree') => {
    setViewMode(mode);
  };

  if (isLoading) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <Typography>Loading 3D Network Visualization...</Typography>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation={{ initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 } }}
      sx={{ width, height, position: 'relative' }}
    >
      {/* Controls Panel */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 100,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          p: 2,
          boxShadow: 3,
          maxWidth: 300,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Network Controls
        </Typography>
        
        {/* View Mode */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>View Mode:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(['sphere', 'grid', 'tree'] as const).map((mode) => (
              <Chip
                key={mode}
                label={mode}
                onClick={() => handleViewModeChange(mode)}
                color={viewMode === mode ? 'primary' : 'default'}
                size="small"
              />
            ))}
          </Box>
        </Box>

        {/* Rotation Speed */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>Rotation Speed:</Typography>
          <Slider
            value={rotationSpeed * 1000}
            onChange={(_, value) => setRotationSpeed((value as number) / 1000)}
            min={0}
            max={10}
            step={0.1}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value.toFixed(1)}x`}
          />
        </Box>

        {/* Connection Opacity */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>Connection Opacity:</Typography>
          <Slider
            value={connectionOpacity * 100}
            onChange={(_, value) => setConnectionOpacity((value as number) / 100)}
            min={0}
            max={100}
            step={5}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}%`}
          />
        </Box>

        {/* Node Scale */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>Node Scale:</Typography>
          <Slider
            value={nodeScale * 10}
            onChange={(_, value) => setNodeScale((value as number) / 10)}
            min={5}
            max={15}
            step={0.5}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${(value / 10).toFixed(1)}x`}
          />
        </Box>

        {/* Stats */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2">
            Active Bots: {bots.filter(b => b.status === 'active').length}
          </Typography>
          <Typography variant="body2">
            Total Bots: {bots.length}
          </Typography>
          <Typography variant="body2">
            Avg Response Time: {metrics.responseTime?.toFixed(0) || 0}ms
          </Typography>
        </Box>
      </Box>

      {/* 3D Canvas Container */}
      <Box
        ref={mountRef}
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 3,
        }}
      />

      {/* Label Overlay */}
      <Box
        ref={labelMountRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </AnimatedBox>
  );
};

export default ThreeJSNetwork;