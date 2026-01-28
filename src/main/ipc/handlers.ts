import { ipcMain, desktopCapturer, screen, BrowserWindow } from 'electron';
import { networkInterfaces } from 'os';
import { DiscoveryService } from '../network/discovery';
import { SignalingServer } from '../network/signaling-server';
import { ScreenCapture } from '../capture/screen-capture';

let discoveryService: DiscoveryService | null = null;
let signalingServer: SignalingServer | null = null;
let screenCapture: ScreenCapture | null = null;

export function setupIpcHandlers(): void {
  // Get available screens for capture
  ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    });
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon?.toDataURL() || null,
    }));
  });

  // Get screen info
  ipcMain.handle('get-screen-info', () => {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    
    return {
      displays: displays.map(d => ({
        id: d.id,
        bounds: d.bounds,
        scaleFactor: d.scaleFactor,
        isPrimary: d.id === primary.id,
      })),
      primaryId: primary.id,
    };
  });

  // Get local network IPs
  ipcMain.handle('get-local-ips', () => {
    const interfaces = networkInterfaces();
    const ips: string[] = [];
    
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (!netInterface) continue;
      
      for (const net of netInterface) {
        // Skip internal and non-IPv4 addresses
        if (!net.internal && net.family === 'IPv4') {
          ips.push(net.address);
        }
      }
    }
    
    return ips;
  });

  // Start teacher session (discovery + signaling)
  ipcMain.handle('start-teacher-session', async (_event, config: {
    teacherName: string;
    roomName: string;
    port: number;
  }) => {
    try {
      // Stop any existing services
      await stopServices();
      
      // Start signaling server
      signalingServer = new SignalingServer(config.port);
      await signalingServer.start(config.teacherName, config.roomName);
      
      // Start discovery service (advertise)
      discoveryService = new DiscoveryService();
      await discoveryService.advertise(config.roomName, config.teacherName, config.port);
      
      // Forward events to renderer
      signalingServer.on('student-joined', (student) => {
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('student-joined', student);
        });
      });
      
      signalingServer.on('student-left', (studentId) => {
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('student-left', studentId);
        });
      });
      
      signalingServer.on('reaction', (data) => {
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('reaction', data);
        });
      });
      
      return { success: true, port: config.port };
    } catch (error) {
      console.error('Failed to start teacher session:', error);
      return { success: false, error: String(error) };
    }
  });

  // Stop teacher session
  ipcMain.handle('stop-teacher-session', async () => {
    await stopServices();
    return { success: true };
  });

  // Discover teachers (for students)
  ipcMain.handle('discover-teachers', async () => {
    try {
      if (!discoveryService) {
        discoveryService = new DiscoveryService();
      }
      
      const teachers = await discoveryService.discover();
      return { success: true, teachers };
    } catch (error) {
      console.error('Failed to discover teachers:', error);
      return { success: false, error: String(error), teachers: [] };
    }
  });

  // Stop discovery
  ipcMain.handle('stop-discovery', async () => {
    if (discoveryService) {
      discoveryService.stopDiscovery();
    }
    return { success: true };
  });

  // Send message through signaling server
  ipcMain.handle('signaling-send', async (_event, message: unknown) => {
    if (signalingServer) {
      signalingServer.broadcast(message);
      return { success: true };
    }
    return { success: false, error: 'Signaling server not running' };
  });

  // Send message to specific student
  ipcMain.handle('signaling-send-to', async (_event, studentId: string, message: unknown) => {
    if (signalingServer) {
      signalingServer.sendTo(studentId, message);
      return { success: true };
    }
    return { success: false, error: 'Signaling server not running' };
  });

  // Kick student
  ipcMain.handle('kick-student', async (_event, studentId: string, reason?: string) => {
    if (signalingServer) {
      signalingServer.kickStudent(studentId, reason);
      return { success: true };
    }
    return { success: false, error: 'Signaling server not running' };
  });

  // Clear all reactions
  ipcMain.handle('clear-reactions', async () => {
    if (signalingServer) {
      signalingServer.clearAllReactions();
      return { success: true };
    }
    return { success: false, error: 'Signaling server not running' };
  });

  // Get connected students
  ipcMain.handle('get-students', async () => {
    if (signalingServer) {
      return { success: true, students: signalingServer.getStudents() };
    }
    return { success: false, students: [] };
  });

  // Screen capture controls
  ipcMain.handle('start-capture', async (_event, sourceId: string) => {
    try {
      if (!screenCapture) {
        screenCapture = new ScreenCapture();
      }
      await screenCapture.start(sourceId);
      return { success: true };
    } catch (error) {
      console.error('Failed to start capture:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('stop-capture', async () => {
    if (screenCapture) {
      screenCapture.stop();
    }
    return { success: true };
  });
}

async function stopServices(): Promise<void> {
  if (signalingServer) {
    await signalingServer.stop();
    signalingServer = null;
  }
  
  if (discoveryService) {
    discoveryService.stopAdvertising();
    discoveryService.stopDiscovery();
    discoveryService = null;
  }
  
  if (screenCapture) {
    screenCapture.stop();
    screenCapture = null;
  }
}
