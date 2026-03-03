/**
 * @wip ROADMAP ITEM — NOT ACTIVE
 *
 * This component is part of the AI Dashboard & Intelligence Features planned for future implementation.
 * It has been removed from the active UI navigation and routing.
 *
 * See docs/reference/IMPROVEMENT_ROADMAP.md — "🤖 AI Dashboard & Intelligence Features (Future Roadmap)"
 * for implementation prerequisites and planned scope.
 *
 * DO NOT import or route to this component until the backend AI APIs are implemented.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import { AnimatedBox } from '../animations/AnimationComponents';
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  SpeakerWaveIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneSolidIcon } from '@heroicons/react/24/solid';

// Web Speech API type declarations
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface WindowWithSpeechRecognition extends Window {
  webkitSpeechRecognition?: new () => SpeechRecognition;
  SpeechRecognition?: new () => SpeechRecognition;
}

export interface NLCommand {
  id: string;
  text: string;
  timestamp: Date;
  intent: NLIntent;
  entities: NLEntity[];
  confidence: number;
  response: string;
  actions: NLAction[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  feedback?: 'positive' | 'negative';
}

export interface NLIntent {
  name: string;
  description: string;
  category: 'dashboard' | 'widget' | 'data' | 'settings' | 'help';
  parameters: NLParameter[];
  examples: string[];
}

export interface NLEntity {
  name: string;
  value: string;
  type: 'metric' | 'widget' | 'time-range' | 'comparison' | 'filter' | 'aggregation';
  confidence: number;
}

export interface NLAction {
  type: 'show-widget' | 'hide-widget' | 'update-widget' | 'filter-data' | 'change-theme' | 'export-data';
  target: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'completed' | 'failed';
  result?: unknown;
}

export interface NLParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  examples: string[];
}

export interface NLConfig {
  enabled: boolean;
  voiceInput: boolean;
  voiceOutput: boolean;
  autoTranslation: boolean;
  contextAwareness: boolean;
  learningEnabled: boolean;
  confidenceThreshold: number;
  maxHistory: number;
  supportedLanguages: string[];
  voiceRecognition: {
    enabled: boolean;
    language: string;
    continuous: boolean;
    interimResults: boolean;
  };
  textToSpeech: {
    enabled: boolean;
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
  };
}

export interface NLPersonalization {
  userId: string;
  preferences: {
    language: string;
    voice: string;
    formality: 'formal' | 'casual';
    detailLevel: 'brief' | 'detailed' | 'comprehensive';
    examples: boolean;
  };
  history: NLCommand[];
  favorites: string[];
  corrections: Record<string, string>;
  learningProgress: number;
}

export interface NLContext {
  currentPage: string;
  selectedWidgets: string[];
  timeRange: { start: Date; end: Date };
  filters: Record<string, unknown>;
  userRole: string;
  permissions: string[];
}

const defaultConfig: NLConfig = {
  enabled: true,
  voiceInput: true,
  voiceOutput: true,
  autoTranslation: true,
  contextAwareness: true,
  learningEnabled: true,
  confidenceThreshold: 0.7,
  maxHistory: 100,
  supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
  voiceRecognition: {
    enabled: true,
    language: 'en-US',
    continuous: false,
    interimResults: true,
  },
  textToSpeech: {
    enabled: true,
    voice: 'Google US English',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
  },
};

// Mock NL intents for demonstration
const mockIntents: NLIntent[] = [
  {
    name: 'show_performance_dashboard',
    description: 'Display performance monitoring dashboard',
    category: 'dashboard',
    parameters: [
      {
        name: 'time_range',
        type: 'time-range',
        required: false,
        description: 'Time period for performance data',
        examples: ['last 24 hours', 'this week', 'past month'],
      },
      {
        name: 'metrics',
        type: 'metric',
        required: false,
        description: 'Specific metrics to display',
        examples: ['CPU usage', 'memory', 'response time'],
      },
    ],
    examples: [
      'Show me performance metrics for the last 24 hours',
      'Display CPU usage dashboard',
      'I want to see memory usage trends',
      'Performance overview please',
    ],
  },
  {
    name: 'add_widget',
    description: 'Add a new widget to the dashboard',
    category: 'widget',
    parameters: [
      {
        name: 'widget_type',
        type: 'widget',
        required: true,
        description: 'Type of widget to add',
        examples: ['chart', 'table', 'gauge', 'counter'],
      },
      {
        name: 'data_source',
        type: 'metric',
        required: true,
        description: 'Data source for the widget',
        examples: ['bot metrics', 'user activity', 'system health'],
      },
    ],
    examples: [
      'Add a chart showing bot response times',
      'I need a table of user activities',
      'Show me a gauge for system health',
      'Add performance counter',
    ],
  },
  {
    name: 'filter_data',
    description: 'Apply filters to dashboard data',
    category: 'data',
    parameters: [
      {
        name: 'filter_criteria',
        type: 'filter',
        required: true,
        description: 'Filtering criteria',
        examples: ['bots with errors', 'users from last week', 'failed requests'],
      },
    ],
    examples: [
      'Show only bots with errors',
      'Filter by users from last week',
      'I want to see failed requests',
      'Show high priority items only',
    ],
  },
  {
    name: 'change_theme',
    description: 'Change dashboard theme or appearance',
    category: 'settings',
    parameters: [
      {
        name: 'theme',
        type: 'string',
        required: true,
        description: 'Theme to apply',
        examples: ['dark', 'light', 'high contrast'],
      },
    ],
    examples: [
      'Switch to dark theme',
      'I prefer light mode',
      'Enable high contrast',
      'Change to dark mode',
    ],
  },
  {
    name: 'export_data',
    description: 'Export dashboard data or reports',
    category: 'data',
    parameters: [
      {
        name: 'format',
        type: 'string',
        required: false,
        description: 'Export format',
        examples: ['CSV', 'JSON', 'PDF', 'Excel'],
      },
      {
        name: 'time_range',
        type: 'time-range',
        required: false,
        description: 'Time period for export',
        examples: ['today', 'this week', 'last month'],
      },
    ],
    examples: [
      'Export data as CSV',
      'Download this week\'s report',
      'Save as PDF please',
      'Export to Excel',
    ],
  },
];

const mockCommands: NLCommand[] = [
  {
    id: 'cmd-001',
    text: 'Show me performance metrics for the last 24 hours',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    intent: mockIntents[0],
    entities: [
      { name: 'time_range', value: 'last 24 hours', type: 'time-range', confidence: 0.95 },
    ],
    confidence: 0.92,
    response: 'Displaying performance metrics for the last 24 hours...',
    actions: [
      {
        type: 'show-widget',
        target: 'performance-widget',
        parameters: { timeRange: '24h' },
        status: 'completed',
        result: { success: true },
      },
    ],
    status: 'completed',
    feedback: 'positive',
  },
  {
    id: 'cmd-002',
    text: 'Add a chart showing bot response times',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    intent: mockIntents[1],
    entities: [
      { name: 'widget_type', value: 'chart', type: 'widget', confidence: 0.88 },
      { name: 'data_source', value: 'bot response times', type: 'metric', confidence: 0.85 },
    ],
    confidence: 0.86,
    response: 'Adding chart widget for bot response times...',
    actions: [
      {
        type: 'update-widget',
        target: 'response-time-chart',
        parameters: { type: 'line', data: 'bot_response_times' },
        status: 'completed',
        result: { widgetId: 'response-chart-001' },
      },
    ],
    status: 'completed',
    feedback: 'positive',
  },
];

interface NaturalLanguageInterfaceProps {
  onCommandExecute?: (command: NLCommand) => void;
}

export const NaturalLanguageInterface: React.FC<NaturalLanguageInterfaceProps> = ({ onCommandExecute }) => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<NLConfig>(defaultConfig);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commands, setCommands] = useState<NLCommand[]>(mockCommands);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_context, _setContext] = useState<NLContext>({
    currentPage: 'dashboard',
    selectedWidgets: [],
    timeRange: { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
    filters: {},
    userRole: 'admin',
    permissions: ['view-dashboard', 'manage-widgets'],
  });
  const [showHelp, setShowHelp] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check for Web Speech API support
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
      initializeSpeechRecognition();
    }
  }, []);

  const initializeSpeechRecognition = () => {
    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognitionConstructor = windowWithSpeech.webkitSpeechRecognition || windowWithSpeech.SpeechRecognition;
    if (SpeechRecognitionConstructor) {
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = config.voiceRecognition.continuous;
      recognitionRef.current.interimResults = config.voiceRecognition.interimResults;
      recognitionRef.current.lang = config.voiceRecognition.language;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result: SpeechRecognitionResult) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  };

  const startListening = () => {
    if (recognitionRef.current && config.voiceInput) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const processNaturalLanguage = async (text: string): Promise<NLCommand> => {
    setIsProcessing(true);

    let responseText = '';
    let confidence = 0.0;
    let intent: NLIntent | null = null;
    let entities: NLEntity[] = [];
    const status: NLCommand['status'] = 'completed';

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai-assist/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: text })
      });

      if (res.ok) {
        const data = await res.json();
        responseText = data.result;
        confidence = 1.0;
        intent = {
          name: 'chat',
          description: 'Chat with AI',
          category: 'help',
          parameters: [],
          examples: []
        };
      } else {
        // Fallback to mock behavior if backend fails or not configured
        // Distinguish between error types for better user feedback
        if (res.status === 401) {
          console.warn('AI Assist: Authentication required - user may need to log in');
        } else if (res.status === 400) {
          const errorData = await res.json().catch(() => ({}));
          console.warn('AI Assist: Configuration error:', errorData.error || res.statusText);
        } else {
          console.warn('AI Assist: Backend error, falling back to mock:', res.statusText);
        }

        // Simulate NLP processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simple intent matching (in real implementation, this would use actual NLP)
        const matchedIntent = mockIntents.find(intent =>
          intent.examples.some(example =>
            text.toLowerCase().includes(example.toLowerCase()) ||
            example.toLowerCase().includes(text.toLowerCase()),
          ),
        ) || null; // Convert undefined to null for type safety

        confidence = matchedIntent ? 0.85 : 0.3;
        intent = matchedIntent || {
          name: 'unknown',
          description: 'Unknown command',
          category: 'help',
          parameters: [],
          examples: [],
        };
        entities = extractEntities(text);
        responseText = generateResponse(text, matchedIntent, confidence);
      }
    } catch (error) {
      console.error('Error calling AI Assist:', error);
      // Simulate NLP processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simple intent matching (in real implementation, this would use actual NLP)
      const matchedIntent = mockIntents.find(intent =>
        intent.examples.some(example =>
          text.toLowerCase().includes(example.toLowerCase()) ||
          example.toLowerCase().includes(text.toLowerCase()),
        ),
      ) || null; // Convert undefined to null for type safety

      confidence = matchedIntent ? 0.85 : 0.3;
      intent = matchedIntent || {
        name: 'unknown',
        description: 'Unknown command',
        category: 'help',
        parameters: [],
        examples: [],
      };
      entities = extractEntities(text);
      responseText = generateResponse(text, matchedIntent, confidence);
    }

    // Ensure intent is always defined (fallback to unknown if somehow null)
    const finalIntent: NLIntent = intent || {
      name: 'unknown',
      description: 'Unknown command',
      category: 'help' as const,
      parameters: [],
      examples: [],
    };

    const command: NLCommand = {
      id: `cmd-${Date.now()}`,
      text,
      timestamp: new Date(),
      intent: finalIntent,
      entities: entities,
      confidence,
      response: responseText,
      actions: generateActions(text, finalIntent, confidence),
      status: status,
    };

    setIsProcessing(false);
    return command;
  };

  const extractEntities = (text: string): NLEntity[] => {
    const entities: NLEntity[] = [];

    // Time range extraction
    const timePatterns = [
      { pattern: /last (\d+) hours?/i, type: 'time-range' as const, value: (match: RegExpMatchArray) => `last-${match[1]}h` },
      { pattern: /this week/i, type: 'time-range' as const, value: () => 'this-week' },
      { pattern: /past month/i, type: 'time-range' as const, value: () => 'past-month' },
    ];

    timePatterns.forEach(({ pattern, type, value }) => {
      const match = text.match(pattern);
      if (match) {
        entities.push({
          name: 'time_range',
          value: typeof value === 'function' ? value(match) : value,
          type,
          confidence: 0.9,
        });
      }
    });

    // Widget type extraction
    const widgetTypes = ['chart', 'table', 'gauge', 'counter', 'graph'];
    widgetTypes.forEach(widget => {
      if (text.toLowerCase().includes(widget)) {
        entities.push({
          name: 'widget_type',
          value: widget,
          type: 'widget' as const,
          confidence: 0.8,
        });
      }
    });

    // Metric extraction
    const metrics = ['cpu', 'memory', 'response time', 'throughput', 'error rate'];
    metrics.forEach(metric => {
      if (text.toLowerCase().includes(metric)) {
        entities.push({
          name: 'metric',
          value: metric,
          type: 'metric' as const,
          confidence: 0.85,
        });
      }
    });

    return entities;
  };

  const generateResponse = (text: string, intent: NLIntent | null, confidence: number): string => {
    if (confidence < config.confidenceThreshold) {
      return 'I didn\'t understand that. Could you please rephrase or ask for help?';
    }

    if (!intent) {
      return 'I\'m not sure what you\'d like me to do. Try asking for help to see what I can do.';
    }

    switch (intent.name) {
      case 'show_performance_dashboard':
        return 'Displaying performance dashboard with the requested metrics...';
      case 'add_widget':
        return 'Adding the requested widget to your dashboard...';
      case 'filter_data':
        return 'Applying filters to show the requested data...';
      case 'change_theme':
        return 'Changing theme as requested...';
      case 'export_data':
        return 'Preparing data export...';
      default:
        return 'Processing your request...';
    }
  };

  const generateActions = (text: string, intent: NLIntent | null, confidence: number): NLAction[] => {
    if (confidence < config.confidenceThreshold || !intent) {
      return [];
    }

    // Generate actions based on intent
    const actions: NLAction[] = [];

    switch (intent.name) {
      case 'show_performance_dashboard':
        actions.push({
          type: 'show-widget',
          target: 'performance-dashboard',
          parameters: { timeRange: '24h', refresh: true },
          status: 'pending',
        });
        break;
      case 'add_widget':
        actions.push({
          type: 'update-widget',
          target: 'dashboard',
          parameters: { type: 'chart', position: 'auto' },
          status: 'pending',
        });
        break;
      case 'filter_data':
        actions.push({
          type: 'filter-data',
          target: 'dashboard-data',
          parameters: { criteria: 'custom' },
          status: 'pending',
        });
        break;
      case 'change_theme':
        actions.push({
          type: 'change-theme',
          target: 'app-theme',
          parameters: { theme: 'dark' },
          status: 'pending',
        });
        break;
      case 'export_data':
        actions.push({
          type: 'export-data',
          target: 'dashboard-data',
          parameters: { format: 'CSV' },
          status: 'pending',
        });
        break;
    }

    return actions;
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) { return; }

    const command = await processNaturalLanguage(inputText);
    setCommands(prev => [command, ...prev].slice(0, config.maxHistory));
    setInputText('');

    if (onCommandExecute) {
      onCommandExecute(command);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _toggleFeature = (feature: keyof NLConfig) => {
    setConfig(prev => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  const speakResponse = (text: string) => {
    if (config.textToSpeech.enabled && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === config.textToSpeech.voice) || null;
      utterance.rate = config.textToSpeech.rate;
      utterance.pitch = config.textToSpeech.pitch;
      utterance.volume = config.textToSpeech.volume;
      speechSynthesis.speak(utterance);
    }
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation="fade-in"
        className="p-6 flex justify-center items-center min-h-[400px]"
      >
        <div className="card bg-base-100 shadow-xl max-w-md text-center">
          <div className="card-body">
            <ChatBubbleLeftRightIcon className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="card-title justify-center mb-2">
              Natural Language Interface
            </h2>
            <p className="text-base-content/70">
              Please log in to access voice and text commands.
            </p>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation="slide-up"
      className="w-full space-y-6"
    >
      {/* WIP Banner */}
      <div className="alert alert-warning shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <div>
          <h3 className="font-bold">Work in Progress</h3>
          <div className="text-xs">This feature is currently under development. Backend connectivity is partial.</div>
        </div>
      </div>

      {/* Natural Language Interface Header */}
      <div className="card bg-base-100 shadow-lg border-l-4 border-primary">
        <div className="card-body p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <ChatBubbleLeftRightIcon className="w-10 h-10 text-primary" />
              <div>
                <h2 className="card-title text-2xl">
                  Natural Language Interface
                </h2>
                <p className="text-base-content/70">
                  Voice & text commands • {config.supportedLanguages.length} languages supported
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="indicator">
                <span className="indicator-item badge badge-primary badge-sm">{commands.length}</span>
                <button className="btn btn-circle btn-ghost btn-sm">
                  <ClockIcon className="w-5 h-5" />
                </button>
              </div>
              {voiceSupported && (
                <button
                  className={`btn btn-circle btn-sm ${isListening ? 'btn-error' : 'btn-ghost'}`}
                  onClick={toggleVoiceInput}
                  disabled={!config.voiceInput}
                >
                  {isListening ? <MicrophoneSolidIcon className="w-5 h-5 animate-pulse" /> : <MicrophoneIcon className="w-5 h-5" />}
                </button>
              )}
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={() => setShowHelp(!showHelp)}
              >
                <QuestionMarkCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Input Status */}
      {voiceSupported && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">
                Voice Recognition: <span className="font-bold">{config.voiceRecognition.enabled ? 'Enabled' : 'Disabled'}</span>
              </span>
              <div className={`badge ${isListening ? 'badge-error gap-2' : 'badge-success gap-2'}`}>
                {isListening ? <MicrophoneSolidIcon className="w-3 h-3 animate-pulse" /> : <MicrophoneIcon className="w-3 h-3" />}
                {isListening ? 'Listening...' : 'Voice Ready'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Command Input */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="form-control relative">
            <div className="absolute top-3 left-3 text-primary">
              <CpuChipIcon className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
            </div>
            <textarea
              className="textarea textarea-bordered pl-10 pr-24 h-24 w-full text-base"
              placeholder="Type your command here or use voice input..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing}
            ></textarea>
            <div className="absolute bottom-3 right-3 flex gap-1">
              {config.textToSpeech.enabled && (
                <button
                  className="btn btn-circle btn-ghost btn-sm"
                  onClick={() => speakResponse(inputText)}
                  disabled={!inputText}
                >
                  <SpeakerWaveIcon className="w-5 h-5" />
                </button>
              )}
              <button
                className="btn btn-circle btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={!inputText || isProcessing}
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          {isProcessing && (
            <progress className="progress progress-primary w-full mt-2"></progress>
          )}
        </div>
      </div>

      {/* Command History */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            Command History ({commands.length})
          </h3>
          <div className="overflow-y-auto max-h-[400px]">
            <ul className="menu bg-base-100 w-full p-0">
              {commands.map((command) => (
                <li key={command.id} className="border-b border-base-200 last:border-none">
                  <div className="flex flex-col gap-2 py-3 hover:bg-base-200">
                    <div className="flex items-start gap-3 w-full">
                      <div className="mt-1">
                        {command.status === 'completed' ? (
                          <CheckCircleIcon className="w-6 h-6 text-success" />
                        ) : command.status === 'failed' ? (
                          <XMarkIcon className="w-6 h-6 text-error" />
                        ) : (
                          <CpuChipIcon className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{command.text}</span>
                          <div className="flex gap-2 items-center">
                            {command.feedback === 'positive' && <HandThumbUpIcon className="w-4 h-4 text-success" />}
                            {command.feedback === 'negative' && <HandThumbDownIcon className="w-4 h-4 text-error" />}
                            <div className={`badge badge-sm ${command.confidence > 0.8 ? 'badge-success' :
                              command.confidence > 0.6 ? 'badge-warning' : 'badge-error'
                              }`}>
                              {(command.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <div className="bg-base-200 rounded p-2 mt-2 text-sm">
                          {command.response}
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs text-base-content/60">
                          <span>{command.timestamp.toLocaleTimeString()} • {command.intent.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">Available Commands</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockIntents.map(intent => (
                <div key={intent.name} className="collapse collapse-arrow bg-base-200">
                  <input type="radio" name="help-accordion" />
                  <div className="collapse-title font-medium">
                    {intent.name.replace(/_/g, ' ')}
                  </div>
                  <div className="collapse-content">
                    <p className="text-sm mb-2">{intent.description}</p>
                    <div className="divider my-1"></div>
                    <p className="text-xs font-bold mb-1">Examples:</p>
                    <ul className="list-disc list-inside text-xs text-base-content/70">
                      {intent.examples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AnimatedBox>
  );
};

export default NaturalLanguageInterface;