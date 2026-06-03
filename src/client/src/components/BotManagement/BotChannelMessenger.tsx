import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import Card from '../DaisyUI/Card';
import Select from '../DaisyUI/Select';
import Input from '../DaisyUI/Input';
import Button from '../DaisyUI/Button';
import { useSuccessToast, useErrorToast } from '../DaisyUI/ToastNotification';
import { apiService } from '../../services/api';

interface Channel {
  id: string;
  name: string;
  type?: string;
}

interface BotChannelMessengerProps {
  botId: string;
  botName: string;
}

const BotChannelMessenger: React.FC<BotChannelMessengerProps> = ({ botId, botName }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(false);
  
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const fetchChannels = async () => {
    setFetching(true);
    try {
      const data = await apiService.getBotChannels(botId);
      setChannels(data);
      if (data.length > 0 && !selectedChannel) {
        setSelectedChannel(data[0].id);
      }
    } catch (error: any) {
      console.error('Failed to fetch channels:', error);
      errorToast('Failed to fetch channels');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (botId) {
      fetchChannels();
    }
  }, [botId]);

  const handleSendMessage = async () => {
    if (!selectedChannel || !message.trim()) return;

    setLoading(true);
    try {
      await apiService.sendBotMessage(botId, selectedChannel, message);
      successToast(`Message sent to ${channels.find(c => c.id === selectedChannel)?.name || 'channel'}`);
      setMessage('');
    } catch (error: any) {
      errorToast(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Bot Channel Messenger" className="bg-base-200">
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="label">
              <span className="label-text flex items-center gap-1">
                <MessageSquare className="w-4 h-4" /> Select Channel
              </span>
            </label>
            <Select
              className="w-full"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              options={channels.map(c => ({
                label: `#${c.name} (${c.type || 'text'})`,
                value: c.id
              }))}
              disabled={fetching || channels.length === 0}
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchChannels} 
            disabled={fetching}
            className="mb-1"
          >
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        <div>
          <label className="label">
            <span className="label-text">Message</span>
          </label>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder={`Send message as ${botName}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={loading || !selectedChannel}
            />
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={loading || !selectedChannel || !message.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        {channels.length === 0 && !fetching && (
          <p className="text-xs text-base-content/60 italic">
            No active channels found for this bot. Make sure it is connected and has permissions.
          </p>
        )}
      </div>
    </Card>
  );
};

export default BotChannelMessenger;
