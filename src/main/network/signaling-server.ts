import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  Student, 
  ReactionType,
  JoinMessage,
  ReactionMessage,
  WelcomeMessage,
  StudentJoinedMessage,
  StudentLeftMessage,
  ReactionUpdateMessage,
  AllReactionsMessage,
  ClearReactionsMessage,
  KickedMessage,
  ProtocolMessage,
} from '@shared/types';
import { REACTION_TIMEOUT } from '@shared/constants';

interface ConnectedClient {
  ws: WebSocket;
  student: Student;
}

export class SignalingServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private teacherId: string = '';
  private teacherName: string = '';
  private roomName: string = '';
  private reactionTimers: Map<string, NodeJS.Timeout> = new Map();
  private port: number;

  constructor(port: number) {
    super();
    this.port = port;
  }

  /**
   * Start the signaling server
   */
  async start(teacherName: string, roomName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.teacherId = uuidv4();
        this.teacherName = teacherName;
        this.roomName = roomName;

        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('listening', () => {
          console.info(`Signaling server started on port ${this.port}`);
          resolve();
        });

        this.wss.on('error', (error) => {
          console.error('WebSocket server error:', error);
          reject(error);
        });

        this.wss.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the signaling server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Clear all reaction timers
      this.reactionTimers.forEach(timer => clearTimeout(timer));
      this.reactionTimers.clear();

      // Close all client connections
      this.clients.forEach(client => {
        client.ws.close(1000, 'Server shutting down');
      });
      this.clients.clear();

      if (this.wss) {
        this.wss.close(() => {
          console.info('Signaling server stopped');
          this.wss = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: unknown): void {
    const clientId = uuidv4();
    console.info(`New connection: ${clientId}`);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as ProtocolMessage;
        this.handleMessage(clientId, ws, message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
      this.handleDisconnect(clientId);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(clientId: string, ws: WebSocket, message: ProtocolMessage): void {
    switch (message.type) {
      case 'join':
        this.handleJoin(clientId, ws, message as JoinMessage);
        break;
      case 'reaction':
        this.handleReaction(message as ReactionMessage);
        break;
      case 'answer':
      case 'ice-candidate':
        // Forward WebRTC signaling to teacher (main process)
        this.emit('webrtc-signal', { clientId, message });
        break;
      default:
        console.warn(`Unknown message type: ${(message as {type: string}).type}`);
    }
  }

  /**
   * Handle student joining
   */
  private handleJoin(clientId: string, ws: WebSocket, message: JoinMessage): void {
    const student: Student = {
      id: message.studentId || clientId,
      name: message.studentName,
      reaction: null,
      reactionTimestamp: null,
      connected: true,
      lastSeen: Date.now(),
    };

    this.clients.set(student.id, { ws, student });

    // Send welcome message to the new student
    const welcomeMsg: WelcomeMessage = {
      type: 'welcome',
      teacherId: this.teacherId,
      teacherName: this.teacherName,
      roomName: this.roomName,
      students: this.getStudents(),
      timestamp: Date.now(),
    };
    this.send(ws, welcomeMsg);

    // Notify all students about the new student
    const joinedMsg: StudentJoinedMessage = {
      type: 'student-joined',
      student,
      timestamp: Date.now(),
    };
    this.broadcastExcept(student.id, joinedMsg);

    // Send current reactions state
    this.sendAllReactions(ws);

    // Emit event for main process
    this.emit('student-joined', student);
    
    console.info(`Student joined: ${student.name} (${student.id})`);
  }

  /**
   * Handle student disconnection
   */
  private handleDisconnect(clientId: string): void {
    // Find student by clientId
    let studentId: string | null = null;
    
    this.clients.forEach((client, id) => {
      if (client.ws.readyState === WebSocket.CLOSED || client.ws.readyState === WebSocket.CLOSING) {
        studentId = id;
      }
    });

    if (!studentId) {
      // Try direct lookup
      if (this.clients.has(clientId)) {
        studentId = clientId;
      }
    }

    if (studentId && this.clients.has(studentId)) {
      const { student } = this.clients.get(studentId)!;
      
      // Clear reaction timer
      if (this.reactionTimers.has(studentId)) {
        clearTimeout(this.reactionTimers.get(studentId)!);
        this.reactionTimers.delete(studentId);
      }

      this.clients.delete(studentId);

      // Notify all students
      const leftMsg: StudentLeftMessage = {
        type: 'student-left',
        studentId,
        timestamp: Date.now(),
      };
      this.broadcast(leftMsg);

      // Emit event for main process
      this.emit('student-left', studentId);
      
      console.info(`Student left: ${student.name} (${studentId})`);
    }
  }

  /**
   * Handle reaction from student
   */
  private handleReaction(message: ReactionMessage): void {
    const client = this.clients.get(message.studentId);
    if (!client) return;

    // Clear existing reaction timer
    if (this.reactionTimers.has(message.studentId)) {
      clearTimeout(this.reactionTimers.get(message.studentId)!);
      this.reactionTimers.delete(message.studentId);
    }

    // Update student reaction
    client.student.reaction = message.reaction;
    client.student.reactionTimestamp = message.reaction ? Date.now() : null;

    // Set auto-clear timer for non-null reactions
    if (message.reaction) {
      const timer = setTimeout(() => {
        this.clearStudentReaction(message.studentId);
      }, REACTION_TIMEOUT);
      this.reactionTimers.set(message.studentId, timer);
    }

    // Broadcast reaction update to all clients
    const updateMsg: ReactionUpdateMessage = {
      type: 'reaction-update',
      studentId: message.studentId,
      reaction: message.reaction,
      timestamp: Date.now(),
    };
    this.broadcast(updateMsg);

    // Emit event for main process
    this.emit('reaction', {
      studentId: message.studentId,
      reaction: message.reaction,
    });
  }

  /**
   * Clear a student's reaction
   */
  private clearStudentReaction(studentId: string): void {
    const client = this.clients.get(studentId);
    if (!client) return;

    client.student.reaction = null;
    client.student.reactionTimestamp = null;

    // Clear timer
    if (this.reactionTimers.has(studentId)) {
      clearTimeout(this.reactionTimers.get(studentId)!);
      this.reactionTimers.delete(studentId);
    }

    // Broadcast update
    const updateMsg: ReactionUpdateMessage = {
      type: 'reaction-update',
      studentId,
      reaction: null,
      timestamp: Date.now(),
    };
    this.broadcast(updateMsg);

    // Emit event
    this.emit('reaction', { studentId, reaction: null });
  }

  /**
   * Clear all reactions
   */
  clearAllReactions(): void {
    // Clear all timers
    this.reactionTimers.forEach(timer => clearTimeout(timer));
    this.reactionTimers.clear();

    // Clear all student reactions
    this.clients.forEach(client => {
      client.student.reaction = null;
      client.student.reactionTimestamp = null;
    });

    // Broadcast clear message
    const clearMsg: ClearReactionsMessage = {
      type: 'clear-reactions',
      timestamp: Date.now(),
    };
    this.broadcast(clearMsg);
  }

  /**
   * Kick a student
   */
  kickStudent(studentId: string, reason?: string): void {
    const client = this.clients.get(studentId);
    if (!client) return;

    // Send kick message
    const kickedMsg: KickedMessage = {
      type: 'kicked',
      reason,
      timestamp: Date.now(),
    };
    this.send(client.ws, kickedMsg);

    // Close connection
    client.ws.close(1000, reason || 'Kicked by teacher');
  }

  /**
   * Send message to specific client
   */
  private send(ws: WebSocket, message: ProtocolMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send message to specific student by ID
   */
  sendTo(studentId: string, message: unknown): void {
    const client = this.clients.get(studentId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message: unknown): void {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  /**
   * Broadcast message to all clients except one
   */
  private broadcastExcept(excludeId: string, message: ProtocolMessage): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client, id) => {
      if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  /**
   * Send current reactions state to a client
   */
  private sendAllReactions(ws: WebSocket): void {
    const reactions: Record<string, { name: string; reaction: ReactionType; timestamp: number | null }> = {};
    
    this.clients.forEach((client, id) => {
      if (client.student.reaction) {
        reactions[id] = {
          name: client.student.name,
          reaction: client.student.reaction,
          timestamp: client.student.reactionTimestamp,
        };
      }
    });

    const msg: AllReactionsMessage = {
      type: 'all-reactions',
      reactions,
      timestamp: Date.now(),
    };
    this.send(ws, msg);
  }

  /**
   * Get all connected students
   */
  getStudents(): Student[] {
    return Array.from(this.clients.values()).map(c => c.student);
  }

  /**
   * Get student count
   */
  getStudentCount(): number {
    return this.clients.size;
  }
}
