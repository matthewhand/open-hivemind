declare module '@discordjs/voice' {
  export enum VoiceConnectionStatus {
    Connecting = 'connecting',
    Connected = 'connected',
    Ready = 'ready',
    Disconnected = 'disconnected',
    Destroyed = 'destroyed'
  }

  export enum AudioPlayerStatus {
    Idle = 'idle',
    Buffering = 'buffering',
    Playing = 'playing',
    Paused = 'paused',
    AutoPaused = 'autopaused'
  }

  export enum EndBehaviorType {
    Manual = 0,
    AfterSilence = 1,
    AfterInactivity = 2
  }

  export class VoiceConnection {
    destroy(): void;
    subscribe(audioPlayer: any): any;
    on(event: string, listener: (...args: any[]) => void): this;
    readonly receiver: VoiceReceiver;
    readonly state: { status: VoiceConnectionStatus };
  }

  export class VoiceReceiver {
    subscribe(userId: string, options?: { end: { behavior: EndBehaviorType; duration?: number } }): any;
    speaking: any;
    speakingMap: Map<string, any>;
  }

  export class AudioPlayer {
    play(resource: any): any;
    stop(): void;
    on(event: string, listener: (...args: any[]) => void): this;
    readonly state: { status: AudioPlayerStatus };
  }

  export class AudioResource {
    // Add properties and methods as needed
  }

  export function createAudioPlayer(options?: any): AudioPlayer;
  export function createAudioResource(path: string, options?: any): AudioResource;
  export function joinVoiceChannel(options: any): VoiceConnection;
  export function entersState(connection: VoiceConnection, state: any): Promise<any>;
  export function getVoiceConnection(applicationId: string): VoiceConnection | undefined;
  export type DiscordGatewayAdapterCreator = any;
}