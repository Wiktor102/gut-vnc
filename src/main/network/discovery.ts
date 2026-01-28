import Bonjour, { Service, Browser } from 'bonjour-service';
import { EventEmitter } from 'events';
import { MDNS_SERVICE_TYPE, DEFAULT_PORT } from '@shared/constants';

export interface DiscoveredTeacher {
  name: string;
  roomName: string;
  address: string;
  port: number;
}

export class DiscoveryService extends EventEmitter {
  private bonjour: Bonjour;
  private publishedService: Service | null = null;
  private browser: Browser | null = null;
  private discoveredTeachers: Map<string, DiscoveredTeacher> = new Map();

  constructor() {
    super();
    this.bonjour = new Bonjour();
  }

  /**
   * Advertise as a teacher on the network
   */
  async advertise(roomName: string, teacherName: string, port: number = DEFAULT_PORT): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.publishedService = this.bonjour.publish({
          name: `${roomName}-${Date.now()}`,
          type: MDNS_SERVICE_TYPE,
          port: port,
          txt: {
            room: roomName,
            teacher: teacherName,
            version: '1.0',
          },
        });

        this.publishedService.on('up', () => {
          console.info(`mDNS service published: ${roomName} on port ${port}`);
          resolve();
        });

        this.publishedService.on('error', (error) => {
          console.error('mDNS publish error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop advertising
   */
  stopAdvertising(): void {
    if (this.publishedService) {
      this.publishedService.stop(() => {
        console.info('mDNS service stopped');
      });
      this.publishedService = null;
    }
  }

  /**
   * Discover teachers on the network
   */
  async discover(timeout: number = 5000): Promise<DiscoveredTeacher[]> {
    return new Promise((resolve) => {
      this.discoveredTeachers.clear();

      this.browser = this.bonjour.find({ type: MDNS_SERVICE_TYPE }, (service) => {
        this.handleServiceFound(service);
      });

      // Resolve after timeout
      setTimeout(() => {
        resolve(Array.from(this.discoveredTeachers.values()));
      }, timeout);
    });
  }

  /**
   * Start continuous discovery
   */
  startContinuousDiscovery(): void {
    if (this.browser) {
      this.stopDiscovery();
    }

    this.discoveredTeachers.clear();

    this.browser = this.bonjour.find({ type: MDNS_SERVICE_TYPE }, (service) => {
      this.handleServiceFound(service);
    });
  }

  /**
   * Stop discovery
   */
  stopDiscovery(): void {
    if (this.browser) {
      this.browser.stop();
      this.browser = null;
    }
    this.discoveredTeachers.clear();
  }

  /**
   * Get currently discovered teachers
   */
  getDiscoveredTeachers(): DiscoveredTeacher[] {
    return Array.from(this.discoveredTeachers.values());
  }

  private handleServiceFound(service: Service): void {
    // Skip own service
    if (this.publishedService && service.name === this.publishedService.name) {
      return;
    }

    const txt = service.txt as Record<string, string> | undefined;
    if (!txt) return;

    const teacher: DiscoveredTeacher = {
      name: txt.teacher || 'Unknown',
      roomName: txt.room || 'Unknown Room',
      address: service.addresses?.[0] || service.host || 'localhost',
      port: service.port || DEFAULT_PORT,
    };

    const key = `${teacher.address}:${teacher.port}`;
    
    if (!this.discoveredTeachers.has(key)) {
      this.discoveredTeachers.set(key, teacher);
      this.emit('teacher-found', teacher);
      console.info(`Discovered teacher: ${teacher.name} at ${teacher.address}:${teacher.port}`);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAdvertising();
    this.stopDiscovery();
    this.bonjour.destroy();
  }
}
