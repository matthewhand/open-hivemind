import React, { useState, useRef, useEffect } from 'react';
import { Card, Badge, Button, Input, Alert } from '../components/DaisyUI';
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export interface SimpleMessage {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  response?: string;
}

export interface SimpleSuggestion {
  id: string;
  text: string;
  icon: string;
}

const simpleSuggestions: SimpleSuggestion[] = [
  { id: '1', text: 'Show dashboard overview', icon: '📊' },
  { id: '2', text: 'Check bot performance', icon: '🤖' },
  { id: '3', text: 'Recent activity summary', icon: '📈' },
  { id: '4', text: 'System health status', icon: '🔧' },
];

const simpleHistory: SimpleMessage[] = [
  {
    id: '1',
    text: 'Show me the dashboard overview',
    timestamp: new Date(Date.now() - 1800000),
    isUser: true,
    response: 'Here\'s your current dashboard overview with active bots and system metrics.'
  },
  {
    id: '2',
    text: 'How are my bots performing?',
    timestamp: new Date(Date.now() - 3600000),
    isUser: true,
    response: 'Your bots are performing well with 95% uptime and average response time of 2.3s.'
  },
];

export const NaturalLanguageInterface: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<SimpleMessage[]>(simpleHistory);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage: SimpleMessage = {
      id: Date.now().toString(),
      text: inputText,
      timestamp: new Date(),
      isUser: true,
      response: `I understand you want to: "${inputText}". This feature is coming soon!`
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsProcessing(true);

    setTimeout(() => setIsProcessing(false), 1000);
  };

  const handleSuggestionClick = (suggestion: SimpleSuggestion) => {
    setInputText(suggestion.text);
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card className="shadow-lg border-l-4 border-primary">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />
              <div>
                <h2 className="card-title text-lg">Natural Language Interface</h2>
                <p className="text-sm opacity-70">Ask questions in plain English</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="btn-ghost"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Hide' : 'Show'} History
              </Button>
              <Button
                size="sm"
                className="btn-ghost"
                onClick={handleClearHistory}
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chat Interface */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-lg">
            <div className="card-body">
              <div className="h-96 overflow-y-auto space-y-4 p-4 border border-base-300 rounded-lg bg-base-200">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto text-primary mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Start a conversation</p>
                    <p className="text-sm opacity-70">Ask me anything about your dashboard, bots, or system</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.isUser
                              ? 'bg-primary text-primary-content'
                              : 'bg-base-300 text-base-content'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      {message.response && (
                        <div className="flex justify-start">
                          <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-base-200 border border-base-300">
                            <p className="text-sm">{message.response}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex gap-2 mt-4">
                <div className="flex-1 relative">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your question or command..."
                    className="w-full"
                    disabled={isProcessing}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isProcessing}
                  className="btn-primary"
                >
                  {isProcessing ? (
                    <div className="loading loading-spinner loading-sm" />
                  ) : (
                    <PaperAirplaneIcon className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={() => setIsListening(!isListening)}
                  className={`btn-${isListening ? 'error' : 'ghost'}`}
                >
                  <MicrophoneIcon className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Suggestions */}
          <Card className="shadow-lg">
            <div className="card-body">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <QuestionMarkCircleIcon className="w-4 h-4" />
                Try These
              </h3>
              <div className="space-y-2">
                {simpleSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-3 border border-base-300 rounded-lg hover:bg-base-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{suggestion.icon}</span>
                      <span className="text-sm">{suggestion.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Status */}
          <Card className="shadow-lg">
            <div className="card-body">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <CogIcon className="w-4 h-4" />
                AI Status
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Language Model</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Voice Input</span>
                  <Badge variant={isListening ? 'success' : 'neutral'} size="sm">
                    {isListening ? 'Listening' : 'Ready'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Processing</span>
                  <Badge variant={isProcessing ? 'warning' : 'success'} size="sm">
                    {isProcessing ? 'Busy' : 'Ready'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {isListening && (
        <Alert variant="info" className="flex items-center gap-3">
          <MicrophoneIcon className="w-5 h-5 animate-pulse" />
          <div>
            <p className="font-medium">Listening...</p>
            <p className="text-sm opacity-70">Speak clearly into your microphone</p>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default NaturalLanguageInterface;