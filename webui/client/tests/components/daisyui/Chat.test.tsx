import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import Chat from '@/components/DaisyUI/Chat';

describe('Chat Component', () => {
  const mockMessages = [
    { id: 1, text: 'Hello!', sender: 'user', timestamp: new Date() },
    { id: 2, text: 'Hi there!', sender: 'bot', timestamp: new Date() },
    { id: 3, text: 'How are you?', sender: 'user', timestamp: new Date() }
  ];

  it('renders without crashing', () => {
    render(<Chat messages={mockMessages} />);
    
    expect(screen.getByRole('log')).toBeInTheDocument();
  });

  it('displays all messages', () => {
    render(<Chat messages={mockMessages} />);
    
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByText('How are you?')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<Chat messages={mockMessages} className="custom-chat" />);
    
    const chat = screen.getByRole('log');
    expect(chat).toHaveClass('custom-chat');
  });

  it('handles message sending', () => {
    const mockOnSend = jest.fn();
    render(<Chat messages={mockMessages} onSendMessage={mockOnSend} />);
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.click(sendButton);
    
    expect(mockOnSend).toHaveBeenCalledWith('New message');
  });

  it('shows typing indicator when provided', () => {
    render(<Chat messages={mockMessages} isTyping />);
    
    expect(screen.getByText('Someone is typing...')).toBeInTheDocument();
  });

  it('displays message timestamps', () => {
    render(<Chat messages={mockMessages} showTimestamps />);
    
    mockMessages.forEach(message => {
      expect(screen.getByText(message.timestamp.toLocaleTimeString())).toBeInTheDocument();
    });
  });

  it('handles empty messages array', () => {
    render(<Chat messages={[]} />);
    
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<Chat messages={mockMessages} />);
    
    const chat = screen.getByRole('log');
    expect(chat).toHaveAttribute('aria-label', 'Chat messages');
    expect(chat).toHaveAttribute('aria-live', 'polite');
  });

  it('supports different message types', () => {
    const messagesWithTypes = [
      ...mockMessages,
      { id: 4, text: 'System message', sender: 'system', timestamp: new Date() }
    ];
    
    render(<Chat messages={messagesWithTypes} />);
    
    expect(screen.getByText('System message')).toBeInTheDocument();
  });
});