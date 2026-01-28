import { contextBridge, ipcRenderer } from 'electron';

// Types for the exposed API
export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
}

export interface DisplayInfo {
  id: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scaleFactor: number;
  isPrimary: boolean;
}

export interface TeacherInfo {
  name: string;
  roomName: string;
  address: string;
  port: number;
}

export interface StudentInfo {
  id: string;
  name: string;
  reaction: string | null;
  reactionTimestamp: number | null;
  connected: boolean;
}

export interface ElectronAPI {
  // Screen capture
  getSources: () => Promise<ScreenSource[]>;
  getScreenInfo: () => Promise<{ displays: DisplayInfo[]; primaryId: number }>;
  startCapture: (sourceId: string) => Promise<{ success: boolean; error?: string }>;
  stopCapture: () => Promise<{ success: boolean }>;
  
  // Network
  getLocalIPs: () => Promise<string[]>;
  
  // Teacher session
  startTeacherSession: (config: {
    teacherName: string;
    roomName: string;
    port: number;
  }) => Promise<{ success: boolean; port?: number; error?: string }>;
  stopTeacherSession: () => Promise<{ success: boolean }>;
  
  // Discovery
  discoverTeachers: () => Promise<{ success: boolean; teachers: TeacherInfo[]; error?: string }>;
  stopDiscovery: () => Promise<{ success: boolean }>;
  
  // Signaling
  signalingBroadcast: (message: unknown) => Promise<{ success: boolean; error?: string }>;
  signalingSendTo: (studentId: string, message: unknown) => Promise<{ success: boolean; error?: string }>;
  
  // Student management
  getStudents: () => Promise<{ success: boolean; students: StudentInfo[] }>;
  kickStudent: (studentId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  clearReactions: () => Promise<{ success: boolean; error?: string }>;
  
  // Event listeners
  onStudentJoined: (callback: (student: StudentInfo) => void) => () => void;
  onStudentLeft: (callback: (studentId: string) => void) => () => void;
  onReaction: (callback: (data: { studentId: string; reaction: string | null }) => void) => () => void;
  onSignalingMessage: (callback: (message: unknown) => void) => () => void;
}

const electronAPI: ElectronAPI = {
  // Screen capture
  getSources: () => ipcRenderer.invoke('get-sources'),
  getScreenInfo: () => ipcRenderer.invoke('get-screen-info'),
  startCapture: (sourceId) => ipcRenderer.invoke('start-capture', sourceId),
  stopCapture: () => ipcRenderer.invoke('stop-capture'),
  
  // Network
  getLocalIPs: () => ipcRenderer.invoke('get-local-ips'),
  
  // Teacher session
  startTeacherSession: (config) => ipcRenderer.invoke('start-teacher-session', config),
  stopTeacherSession: () => ipcRenderer.invoke('stop-teacher-session'),
  
  // Discovery
  discoverTeachers: () => ipcRenderer.invoke('discover-teachers'),
  stopDiscovery: () => ipcRenderer.invoke('stop-discovery'),
  
  // Signaling
  signalingBroadcast: (message) => ipcRenderer.invoke('signaling-send', message),
  signalingSendTo: (studentId, message) => ipcRenderer.invoke('signaling-send-to', studentId, message),
  
  // Student management
  getStudents: () => ipcRenderer.invoke('get-students'),
  kickStudent: (studentId, reason) => ipcRenderer.invoke('kick-student', studentId, reason),
  clearReactions: () => ipcRenderer.invoke('clear-reactions'),
  
  // Event listeners - return cleanup functions
  onStudentJoined: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, student: StudentInfo) => callback(student);
    ipcRenderer.on('student-joined', handler);
    return () => ipcRenderer.removeListener('student-joined', handler);
  },
  
  onStudentLeft: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, studentId: string) => callback(studentId);
    ipcRenderer.on('student-left', handler);
    return () => ipcRenderer.removeListener('student-left', handler);
  },
  
  onReaction: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { studentId: string; reaction: string | null }) => callback(data);
    ipcRenderer.on('reaction', handler);
    return () => ipcRenderer.removeListener('reaction', handler);
  },
  
  onSignalingMessage: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, message: unknown) => callback(message);
    ipcRenderer.on('signaling-message', handler);
    return () => ipcRenderer.removeListener('signaling-message', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Extend Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
