import { desktopCapturer, screen, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export interface CaptureConfig {
  sourceId: string;
  frameRate: number;
  quality: 'high' | 'medium' | 'low';
}

export class ScreenCapture extends EventEmitter {
  private isCapturing: boolean = false;
  private sourceId: string | null = null;
  private frameInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Start capturing a screen source
   */
  async start(sourceId: string): Promise<void> {
    if (this.isCapturing) {
      this.stop();
    }

    this.sourceId = sourceId;
    this.isCapturing = true;

    console.info(`Screen capture started for source: ${sourceId}`);
    this.emit('started', { sourceId });
  }

  /**
   * Stop capturing
   */
  stop(): void {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    this.isCapturing = false;
    this.sourceId = null;
    
    console.info('Screen capture stopped');
    this.emit('stopped');
  }

  /**
   * Get current capture state
   */
  isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Get current source ID
   */
  getSourceId(): string | null {
    return this.sourceId;
  }
}
