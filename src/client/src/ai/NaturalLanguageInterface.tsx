import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  Badge,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography
} from '@mui/material';
import {
  Help as HelpIcon,
  History as HistoryIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Send as SendIcon,
  SmartToy as AIIcon,
  ThumbDown as DisIcon,
  ThumbUp as LikeIcon,
  TrendingUp as TrendIcon,
  VolumeUp as VolumeIcon
} from '@mui/icons-material';
import { AnimatedBox } from '../animations/AnimationComponents';

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
        type: 'add-widget',
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
  const config = defaultConfig;
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commands, setCommands] = useState<NLCommand[]>(mockCommands);
  const [showHelp, setShowHelp] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<unknown>(null);

  // Check for Web Speech API support
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
      initializeSpeechRecognition();
    }
  }, []);

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = (window as unknown as typeof SpeechRecognition)?.webkitSpeechRecognition || (window as unknown as typeof SpeechRecognition)?.SpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = config.voiceRecognition.continuous;
      recognitionRef.current.interimResults = config.voiceRecognition.interimResults;
      recognitionRef.current.lang = config.voiceRecognition.language;
      
      recognitionRef.current.onresult = (event: unknown) => {
        const e = event as SpeechRecognitionEvent;
        const transcript = Array.from(e.results)
          .map((result) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };
      
      recognitionRef.current.onerror = (event: unknown) => {
        const e = event as SpeechRecognitionErrorEvent;
        console.error('Speech recognition error:', e.error);
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
    
    // Simulate NLP processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple intent matching (in real implementation, this would use actual NLP)
    const matchedIntent = mockIntents.find(intent =>
      intent.examples.some(example =>
        text.toLowerCase().includes(example.toLowerCase()) ||
        example.toLowerCase().includes(text.toLowerCase())
      )
    );
    
    const confidence = matchedIntent ? 0.85 : 0.3;
    
    const command: NLCommand = {
      id: `cmd-${Date.now()}`,
      text,
      timestamp: new Date(),
      intent: matchedIntent || {
        name: 'unknown',
        description: 'Unknown command',
        category: 'help',
        parameters: [],
        examples: [],
      },
      entities: extractEntities(text),
      confidence,
      response: generateResponse(text, matchedIntent, confidence),
      actions: generateActions(text, matchedIntent, confidence),
      status: 'completed',
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
      return "I didn't understand that. Could you please rephrase or ask for help?";
    }
    
    if (!intent) {
      return "I'm not sure what you'd like me to do. Try asking for help to see what I can do.";
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
          type: 'add-widget',
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
    if (!inputText.trim()) return;
    
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
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <AIIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Natural Language Interface
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please log in to access voice and text commands.
            </Typography>
          </CardContent>
        </Card>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
      sx={{ width: '100%' }}
    >
      {/* Natural Language Interface Header */}
      <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <AIIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="h6">
                  Natural Language Interface
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Voice & text commands • {config.supportedLanguages.length} languages supported
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Badge badgeContent={commands.length} color="primary">
                <HistoryIcon />
              </Badge>
              {voiceSupported && (
                <IconButton
                  onClick={toggleVoiceInput}
                  color={isListening ? 'error' : 'default'}
                  disabled={!config.voiceInput}
                >
                  {isListening ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
              )}
              <IconButton onClick={() => setShowHelp(!showHelp)}>
                <HelpIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Voice Input Status */}
      {voiceSupported && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">
                Voice Recognition: {config.voiceRecognition.enabled ? 'Enabled' : 'Disabled'}
              </Typography>
              <Chip
                label={isListening ? 'Listening...' : 'Voice Ready'}
                color={isListening ? 'error' : 'success'}
                icon={isListening ? <MicIcon /> : <MicOffIcon />}
                size="small"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Command Input */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Type your command here or use voice input..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isProcessing}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AIIcon color={isProcessing ? 'disabled' : 'primary'} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Box display="flex" gap={1}>
                    {config.textToSpeech.enabled && (
                      <IconButton onClick={() => speakResponse(inputText)} disabled={!inputText}>
                        <VolumeIcon />
                      </IconButton>
                    )}
                    <IconButton onClick={handleSubmit} disabled={!inputText || isProcessing}>
                      <SendIcon />
                    </IconButton>
                  </Box>
                </InputAdornment>
              ),
            }}
          />
          {isProcessing && (
            <LinearProgress sx={{ mt: 1 }} />
          )}
        </CardContent>
      </Card>

      {/* Command History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Command History ({commands.length})
          </Typography>
          <List dense>
            {commands.map((command, index) => (
              <React.Fragment key={command.id}>
                <ListItem
                  secondaryAction={
                    <Box display="flex" gap={1}>
                      {command.feedback === 'positive' && <LikeIcon color="success" />}
                      {command.feedback === 'negative' && <DisIcon color="error" />}
                      <Chip
                        label={`${(command.confidence * 100).toFixed(0)}%`}
                        size="small"
                        color={command.confidence > 0.8 ? 'success' : command.confidence > 0.6 ? 'warning' : 'error'}
                      />
                    </Box>
                  }
                >
                  <ListItemIcon>
                    {command.status === 'completed' ? (
                      <CheckIcon color="success" />
                    ) : command.status === 'failed' ? (
                      <MicOffIcon color="error" />
                    ) : (
                      <AIIcon color="primary" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={command.text}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {command.response}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {command.timestamp.toLocaleTimeString()} • {command.intent.category}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < commands.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Help Panel */}
      {showHelp && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Available Commands
            </Typography>
            <Grid container spacing={2}>
              {mockIntents.map(intent => (
                <Grid item xs={12} sm={6} key={intent.name}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                        {intent.name.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {intent.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Examples:
                      </Typography>
                      <List dense>
                        {intent.examples.slice(0, 2).map(example => (
                          <ListItem key={example} disableGutters>
                            <ListItemIcon>
                              <TrendIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="caption">
                                  "{example}"
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </AnimatedBox>
  );
};

export default NaturalLanguageInterface;