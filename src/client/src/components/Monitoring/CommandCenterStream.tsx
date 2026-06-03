import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import Mockup from '../DaisyUI/Mockup';
import Badge from '../DaisyUI/Badge';
import { Terminal, Activity, Zap, ShieldAlert, Bot } from 'lucide-react';

interface SystemEvent {
  id: string;
  type: 'INFO' | 'HEAL' | 'WARN' | 'ERROR';
  message: string;
  timestamp: string;
  metadata?: any;
}

const CommandCenterStream: React.FC = () => {
  const { systemEvents: wsEvents } = useWebSocket();
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wsEvents && wsEvents.length > 0) {
      setEvents(wsEvents);
    }
  }, [wsEvents]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const getEventStyle = (type: string) => {
    switch (type) {
      case 'INFO': return 'text-info';
      case 'HEAL': return 'text-success font-bold';
      case 'WARN': return 'text-warning';
      case 'ERROR': return 'text-error font-bold';
      default: return 'text-base-content/70';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'HEAL': return <Zap className="w-3 h-3" />;
      case 'ERROR': return <ShieldAlert className="w-3 h-3" />;
      case 'INFO': return <Bot className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Terminal className="w-6 h-6 text-primary" />
          Command Center Stream
        </h3>
        <Badge variant="outline" size="sm" className="font-mono">LIVE</Badge>
      </div>

      <Mockup 
        type="code" 
        className="bg-neutral text-neutral-content border-none shadow-2xl h-[400px]"
        ariaLabel="Real-time system events"
        content={
          <div 
            ref={scrollRef}
            className="flex flex-col gap-1 overflow-y-auto h-full pr-2 custom-scrollbar"
          >
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                <Activity className="w-8 h-8 animate-pulse" />
                <p className="text-xs italic">Waiting for system events...</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex gap-3 text-[11px] leading-relaxed group hover:bg-white/5 p-1 rounded transition-colors">
                  <span className="opacity-30 select-none font-mono">
                    [{new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}]
                  </span>
                  <span className={`flex items-center gap-1.5 uppercase font-bold min-w-[60px] ${getEventStyle(event.type)}`}>
                    {getEventIcon(event.type)}
                    {event.type}
                  </span>
                  <span className="flex-1 opacity-90 break-words">
                    {event.message}
                  </span>
                  {event.metadata?.botId && (
                    <span className="opacity-20 text-[9px] hidden group-hover:block font-mono">
                      id:{event.metadata.botId.substring(0, 8)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        }
      />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default CommandCenterStream;
