import { AudioRecorder } from '@src/integrations/discord/voice/audioRecorder';
import { VoiceConnection } from '@discordjs/voice';
import fs from 'fs';

jest.mock('fs');

describe('AudioRecorder', () => {
  let recorder: AudioRecorder;
  let mockConnection: jest.Mocked<VoiceConnection>;
  let mockReceiver: any;

  beforeEach(() => {
    mockReceiver = {
      subscribe: jest.fn(),
      speaking: {
        on: jest.fn()
      }
    };
    
    mockConnection = {
      receiver: mockReceiver
    } as any;
    
    recorder = new AudioRecorder(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start recording for specific user', () => {
    const userId = 'user123';
    
    recorder.startRecording(userId);
    
    expect(mockReceiver.subscribe).toHaveBeenCalledWith(userId, expect.any(Object));
  });

  it('should start recording for all users', () => {
    recorder.startRecording();
    
    expect(mockReceiver.speaking.on).toHaveBeenCalledWith('start', expect.any(Function));
  });

  it('should stop recording and return buffers', () => {
    const userId = 'user123';
    recorder['recordings'].set(userId, [Buffer.from('chunk1'), Buffer.from('chunk2')]);
    
    const results = recorder.stopRecording();
    
    expect(results.get(userId)).toEqual(Buffer.concat([Buffer.from('chunk1'), Buffer.from('chunk2')]));
    expect(recorder['recordings'].size).toBe(0);
  });

  it('should save recording to file', async () => {
    const userId = 'user123';
    const chunks = [Buffer.from('audio data')];
    recorder['recordings'].set(userId, chunks);
    
    const mockWriteFile = jest.fn().mockResolvedValue(undefined);
    (fs.promises as any) = { writeFile: mockWriteFile };
    
    const filePath = await recorder.saveRecording(userId, '/output');
    
    expect(filePath).toMatch(/\/output\/recording_user123_\d+\.pcm/);
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/recording_user123_\d+\.pcm/),
      Buffer.concat(chunks)
    );
  });

  it('should throw error when no recording found', async () => {
    await expect(recorder.saveRecording('nonexistent', '/output'))
      .rejects.toThrow('No recording found for user nonexistent');
  });

  it('should calculate recording duration', () => {
    const userId = 'user123';
    const chunks = new Array(100).fill(Buffer.alloc(960)); // 100 chunks of 960 samples
    recorder['recordings'].set(userId, chunks);
    
    const duration = recorder.getRecordingDuration(userId);
    
    expect(duration).toBe(2); // 100 * 960 / 48000 = 2 seconds
  });

  it('should return 0 duration for non-existent recording', () => {
    const duration = recorder.getRecordingDuration('nonexistent');
    expect(duration).toBe(0);
  });
});