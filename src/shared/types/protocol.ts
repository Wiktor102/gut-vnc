// Protocol message types for WebSocket communication

export type UserRole = 'teacher' | 'student';

export type ReactionType = 'hand' | 'thumbsUp' | 'question' | 'confused' | null;

export type ScreenMode = 'live' | 'paused' | 'blank';

export interface Student {
  id: string;
  name: string;
  reaction: ReactionType;
  reactionTimestamp: number | null;
  connected: boolean;
  lastSeen: number;
}

export interface Teacher {
  id: string;
  name: string;
  roomName: string;
}

// WebSocket Messages
export interface BaseMessage {
  type: string;
  timestamp: number;
}

// Student -> Teacher
export interface JoinMessage extends BaseMessage {
  type: 'join';
  studentId: string;
  studentName: string;
}

export interface LeaveMessage extends BaseMessage {
  type: 'leave';
  studentId: string;
}

export interface ReactionMessage extends BaseMessage {
  type: 'reaction';
  studentId: string;
  reaction: ReactionType;
}

// Teacher -> Students
export interface WelcomeMessage extends BaseMessage {
  type: 'welcome';
  teacherId: string;
  teacherName: string;
  roomName: string;
  students: Student[];
}

export interface StudentJoinedMessage extends BaseMessage {
  type: 'student-joined';
  student: Student;
}

export interface StudentLeftMessage extends BaseMessage {
  type: 'student-left';
  studentId: string;
}

export interface ReactionUpdateMessage extends BaseMessage {
  type: 'reaction-update';
  studentId: string;
  reaction: ReactionType;
}

export interface AllReactionsMessage extends BaseMessage {
  type: 'all-reactions';
  reactions: Record<string, { name: string; reaction: ReactionType; timestamp: number | null }>;
}

export interface ClearReactionsMessage extends BaseMessage {
  type: 'clear-reactions';
}

export interface ScreenModeMessage extends BaseMessage {
  type: 'screen-mode';
  mode: ScreenMode;
  message?: string; // For blank screen message
}

export interface KickMessage extends BaseMessage {
  type: 'kick';
  studentId: string;
  reason?: string;
}

export interface KickedMessage extends BaseMessage {
  type: 'kicked';
  reason?: string;
}

// WebRTC Signaling
export interface OfferMessage extends BaseMessage {
  type: 'offer';
  targetId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerMessage extends BaseMessage {
  type: 'answer';
  targetId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage extends BaseMessage {
  type: 'ice-candidate';
  targetId: string;
  candidate: RTCIceCandidateInit;
}

// Annotations
export type AnnotationTool = 'pointer' | 'pen' | 'arrow' | 'rectangle' | 'text' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  points: Point[];
  text?: string;
  timestamp: number;
}

export interface AnnotationMessage extends BaseMessage {
  type: 'annotation';
  annotation: Annotation;
}

export interface AnnotationClearMessage extends BaseMessage {
  type: 'annotation-clear';
}

export interface PointerPositionMessage extends BaseMessage {
  type: 'pointer-position';
  position: Point | null; // null means pointer is hidden
}

// Union types for all messages
export type ClientMessage =
  | JoinMessage
  | LeaveMessage
  | ReactionMessage
  | AnswerMessage
  | IceCandidateMessage;

export type ServerMessage =
  | WelcomeMessage
  | StudentJoinedMessage
  | StudentLeftMessage
  | ReactionUpdateMessage
  | AllReactionsMessage
  | ClearReactionsMessage
  | ScreenModeMessage
  | KickMessage
  | KickedMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | AnnotationMessage
  | AnnotationClearMessage
  | PointerPositionMessage;

export type ProtocolMessage = ClientMessage | ServerMessage;
