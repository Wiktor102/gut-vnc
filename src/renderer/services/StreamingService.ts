import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { RTC_CONFIG, CAPTURE_CONFIG } from '@shared/constants';

interface StreamingPeer {
  id: string;
  pc: RTCPeerConnection;
  connectionState: RTCPeerConnectionState;
}

export class StreamingService extends EventEmitter {
  private peers: Map<string, StreamingPeer> = new Map();
  private localStream: MediaStream | null = null;
  private isActive: boolean = false;

  constructor() {
    super();
  }

  /**
   * Set the local media stream to broadcast
   */
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    this.isActive = true;

    // Add stream to all existing peers
    this.peers.forEach(peer => {
      this.addStreamToPeer(peer.id);
    });

    this.emit('stream-ready', stream);
  }

  /**
   * Add stream tracks to a specific peer
   */
  private addStreamToPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer || !this.localStream) return;

    // Remove existing tracks first
    peer.pc.getSenders().forEach(sender => {
      peer.pc.removeTrack(sender);
    });

    // Add new tracks
    this.localStream.getTracks().forEach(track => {
      peer.pc.addTrack(track, this.localStream!);
    });
  }

  /**
   * Create a new peer connection and return an offer
   */
  async createOffer(studentId: string): Promise<RTCSessionDescriptionInit> {
    // Close existing connection if any
    this.closePeer(studentId);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    
    const peer: StreamingPeer = {
      id: studentId,
      pc,
      connectionState: 'new',
    };

    // Setup event handlers
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('ice-candidate', {
          studentId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      peer.connectionState = pc.connectionState;
      this.emit('connection-state-change', {
        studentId,
        state: pc.connectionState,
      });

      if (pc.connectionState === 'connected') {
        this.emit('peer-connected', studentId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.emit('peer-disconnected', studentId);
      }
    };

    pc.onnegotiationneeded = async () => {
      // Handle renegotiation if needed
      console.info(`Negotiation needed for peer ${studentId}`);
    };

    this.peers.set(studentId, peer);

    // Add local stream if available
    if (this.localStream) {
      this.addStreamToPeer(studentId);
    }

    // Create and return offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    
    await pc.setLocalDescription(offer);
    
    return offer;
  }

  /**
   * Handle answer from a student
   */
  async handleAnswer(studentId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(studentId);
    if (!peer) {
      console.warn(`No peer found for student ${studentId}`);
      return;
    }

    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.info(`Answer set for student ${studentId}`);
    } catch (err) {
      console.error(`Failed to set answer for ${studentId}:`, err);
    }
  }

  /**
   * Handle ICE candidate from a student
   */
  async handleIceCandidate(studentId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(studentId);
    if (!peer) {
      console.warn(`No peer found for student ${studentId}`);
      return;
    }

    try {
      await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error(`Failed to add ICE candidate for ${studentId}:`, err);
    }
  }

  /**
   * Close a specific peer connection
   */
  closePeer(studentId: string): void {
    const peer = this.peers.get(studentId);
    if (peer) {
      peer.pc.close();
      this.peers.delete(studentId);
      this.emit('peer-closed', studentId);
    }
  }

  /**
   * Update encoding parameters for all peers (adaptive bitrate)
   */
  async updateEncodingParams(params: {
    maxBitrate?: number;
    maxFramerate?: number;
    scaleResolutionDownBy?: number;
  }): Promise<void> {
    for (const [studentId, peer] of this.peers) {
      try {
        const senders = peer.pc.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');

        if (videoSender) {
          const parameters = videoSender.getParameters();
          
          if (!parameters.encodings || parameters.encodings.length === 0) {
            parameters.encodings = [{}];
          }

          if (params.maxBitrate !== undefined) {
            parameters.encodings[0].maxBitrate = params.maxBitrate;
          }
          if (params.maxFramerate !== undefined) {
            parameters.encodings[0].maxFramerate = params.maxFramerate;
          }
          if (params.scaleResolutionDownBy !== undefined) {
            parameters.encodings[0].scaleResolutionDownBy = params.scaleResolutionDownBy;
          }

          await videoSender.setParameters(parameters);
        }
      } catch (err) {
        console.error(`Failed to update encoding for ${studentId}:`, err);
      }
    }
  }

  /**
   * Get statistics for a peer connection
   */
  async getStats(studentId: string): Promise<RTCStatsReport | null> {
    const peer = this.peers.get(studentId);
    if (!peer) return null;

    try {
      return await peer.pc.getStats();
    } catch (err) {
      console.error(`Failed to get stats for ${studentId}:`, err);
      return null;
    }
  }

  /**
   * Stop all streaming and close all connections
   */
  stop(): void {
    // Close all peers
    for (const [studentId] of this.peers) {
      this.closePeer(studentId);
    }
    this.peers.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.isActive = false;
    this.emit('stopped');
  }

  /**
   * Get number of connected peers
   */
  getConnectedCount(): number {
    let count = 0;
    this.peers.forEach(peer => {
      if (peer.connectionState === 'connected') {
        count++;
      }
    });
    return count;
  }

  /**
   * Get all peer IDs
   */
  getPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  /**
   * Check if streaming is active
   */
  getIsActive(): boolean {
    return this.isActive;
  }
}

// Singleton instance for the teacher's streaming service
let streamingServiceInstance: StreamingService | null = null;

export function getStreamingService(): StreamingService {
  if (!streamingServiceInstance) {
    streamingServiceInstance = new StreamingService();
  }
  return streamingServiceInstance;
}

export function destroyStreamingService(): void {
  if (streamingServiceInstance) {
    streamingServiceInstance.stop();
    streamingServiceInstance = null;
  }
}
