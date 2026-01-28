import { BrowserWindow, desktopCapturer } from 'electron';
import { EventEmitter } from 'events';
import { RTC_CONFIG, CAPTURE_CONFIG } from '@shared/constants';

interface PeerConnection {
  id: string;
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
}

export class WebRTCBroadcaster extends EventEmitter {
  private peers: Map<string, PeerConnection> = new Map();
  private mediaStream: MediaStream | null = null;
  private isStreaming: boolean = false;

  constructor() {
    super();
  }

  /**
   * Start capturing and prepare for streaming
   */
  async startCapture(sourceId: string): Promise<MediaStream> {
    try {
      // Get the stream from the main window's webContents
      // We need to use desktopCapturer in the renderer process
      // and pass the stream through IPC
      
      // For now, we'll emit an event to request the stream from renderer
      this.emit('request-stream', sourceId);
      
      this.isStreaming = true;
      return this.mediaStream!;
    } catch (error) {
      console.error('Failed to start capture:', error);
      throw error;
    }
  }

  /**
   * Set the media stream (called from renderer via IPC)
   */
  setMediaStream(stream: MediaStream): void {
    this.mediaStream = stream;
    
    // Add stream to all existing peers
    this.peers.forEach(peer => {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          peer.pc.addTrack(track, this.mediaStream!);
        });
      }
    });
  }

  /**
   * Create a new peer connection for a student
   */
  async createPeerConnection(studentId: string): Promise<RTCSessionDescriptionInit> {
    // Close existing connection if any
    if (this.peers.has(studentId)) {
      this.closePeerConnection(studentId);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    
    // Create data channel for annotations and control messages
    const dataChannel = pc.createDataChannel('control', {
      ordered: true,
    });

    const peerConnection: PeerConnection = {
      id: studentId,
      pc,
      dataChannel,
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('ice-candidate', {
          studentId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.info(`ICE connection state for ${studentId}: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        this.emit('peer-disconnected', studentId);
      }
    };

    pc.onconnectionstatechange = () => {
      console.info(`Connection state for ${studentId}: ${pc.connectionState}`);
      
      if (pc.connectionState === 'connected') {
        this.emit('peer-connected', studentId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.emit('peer-disconnected', studentId);
      }
    };

    // Add media stream tracks if available
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        pc.addTrack(track, this.mediaStream!);
      });
    }

    this.peers.set(studentId, peerConnection);

    // Create offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    
    await pc.setLocalDescription(offer);

    return offer;
  }

  /**
   * Handle answer from student
   */
  async handleAnswer(studentId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(studentId);
    if (!peer) {
      console.warn(`No peer connection found for student ${studentId}`);
      return;
    }

    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error(`Failed to set remote description for ${studentId}:`, error);
    }
  }

  /**
   * Handle ICE candidate from student
   */
  async handleIceCandidate(studentId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(studentId);
    if (!peer) {
      console.warn(`No peer connection found for student ${studentId}`);
      return;
    }

    try {
      await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`Failed to add ICE candidate for ${studentId}:`, error);
    }
  }

  /**
   * Send data to specific student via data channel
   */
  sendToStudent(studentId: string, data: unknown): void {
    const peer = this.peers.get(studentId);
    if (peer?.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast data to all students via data channel
   */
  broadcast(data: unknown): void {
    const message = JSON.stringify(data);
    this.peers.forEach(peer => {
      if (peer.dataChannel?.readyState === 'open') {
        peer.dataChannel.send(message);
      }
    });
  }

  /**
   * Close a specific peer connection
   */
  closePeerConnection(studentId: string): void {
    const peer = this.peers.get(studentId);
    if (peer) {
      peer.dataChannel?.close();
      peer.pc.close();
      this.peers.delete(studentId);
    }
  }

  /**
   * Stop streaming and close all connections
   */
  stop(): void {
    // Close all peer connections
    this.peers.forEach((peer, studentId) => {
      this.closePeerConnection(studentId);
    });
    this.peers.clear();

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.isStreaming = false;
  }

  /**
   * Get number of connected peers
   */
  getPeerCount(): number {
    return this.peers.size;
  }

  /**
   * Check if streaming
   */
  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Update video encoding parameters for adaptive bitrate
   */
  async updateEncodingParameters(params: {
    maxBitrate?: number;
    maxFramerate?: number;
    scaleResolutionDownBy?: number;
  }): Promise<void> {
    for (const [, peer] of this.peers) {
      const senders = peer.pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      
      if (videoSender) {
        const parameters = videoSender.getParameters();
        
        if (parameters.encodings && parameters.encodings.length > 0) {
          parameters.encodings[0] = {
            ...parameters.encodings[0],
            ...params,
          };
          
          await videoSender.setParameters(parameters);
        }
      }
    }
  }
}
