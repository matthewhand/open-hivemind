import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CyberScreensaver: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate random logs
  useEffect(() => {
    const systems = [
      'NEURAL_NET', 'MEMORY_CORE', 'BOT_SWARM', 'UPLINK_V4',
      'SEC_GRID', 'DATA_SHARD', 'QUANTUM_LINK', 'FIREWALL'
    ];
    const actions = [
      'Optimizing', 'Scanning', 'Verifying', 'Syncing',
      'Encrypting', 'Purging', 'Rebalancing', 'Handshaking'
    ];
    const statuses = [
      'OK', 'STABLE', 'SECURE', 'ACTIVE', '99.9%', 'COMPLETE', 'STANDBY'
    ];

    const addLog = () => {
      const system = systems[Math.floor(Math.random() * systems.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

      const newLog = `[${timestamp}] ${system} > ${action}... ${status}`;

      setLogs(prev => {
        const newLogs = [...prev, newLog];
        return newLogs.slice(-15); // Keep only last 15 logs
      });
    };

    // Initial fill
    for (let i = 0; i < 5; i++) addLog();

    const logTimer = setInterval(addLog, 800);
    return () => clearInterval(logTimer);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="fixed inset-0 z-[2000] bg-black text-green-500 font-mono overflow-hidden select-none cursor-none flex flex-col items-center justify-center">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
           style={{
             backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}
      />

      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,black_100%)] pointer-events-none" />

      {/* Main Content Container */}
      <div className="z-10 flex flex-col items-center gap-12 max-w-4xl w-full p-8">

        {/* Header / Status */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center"
        >
          <div className="text-sm tracking-[0.5em] text-green-400 mb-2 opacity-70">SYSTEM STATUS: OPERATIONAL</div>
          <div className="h-px w-64 bg-green-500/50 mx-auto" />
        </motion.div>

        {/* Digital Clock */}
        <div className="text-center">
          <h1 className="text-9xl font-bold tracking-tighter text-white drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]">
            {time.toLocaleTimeString([], { hour12: false })}
          </h1>
          <div className="text-green-400 mt-2 tracking-widest text-xl opacity-80">
            {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
          </div>
        </div>

        {/* System Logs Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="w-full max-w-2xl border border-green-800 bg-black/80 rounded p-1 relative overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.1)]"
        >
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-3 py-1 bg-green-900/20 border-b border-green-800/50 mb-1">
            <span className="text-xs text-green-400">root@hivemind:~# system_monitor --live</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>

          {/* Terminal Body */}
          <div
            ref={logContainerRef}
            className="h-48 overflow-hidden p-2 font-mono text-sm leading-relaxed"
          >
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div
                  key={`${i}-${log.substring(0, 10)}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-green-400/90 whitespace-nowrap"
                >
                  <span className="text-green-600 mr-2">$</span>
                  {log}
                </motion.div>
              ))}
            </AnimatePresence>
            <motion.div
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block w-2 h-4 bg-green-500 ml-1 align-middle"
            />
          </div>
        </motion.div>

        {/* Footer Stats */}
        <div className="flex justify-between w-full max-w-2xl text-xs text-green-600 mt-4 px-4">
          <div>UPTIME: {Math.floor(typeof performance !== 'undefined' ? performance.now() / 1000 : 0)}s</div>
          <div>CPU LOAD: {Math.floor(Math.random() * 30 + 10)}%</div>
          <div>MEMORY: {Math.floor(Math.random() * 40 + 20)}%</div>
        </div>

      </div>
    </div>
  );
};

export default CyberScreensaver;
