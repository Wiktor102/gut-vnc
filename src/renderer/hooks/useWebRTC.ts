import { useState, useCallback, useRef, useEffect } from 'react';
import { RTC_CONFIG } from '@shared/constants';

interface UseWebRTCOptions {
  onTrack?: (stream: MediaStream) => void;
  onDataChannelMessage?: (data: unknown) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isConnected, setIsConnected] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        streamRef.current = event.streams[0];
        options.onTrack?.(event.streams[0]);
      }
    };

    pc.ondatachannel = (event) => {
      dataChannelRef.current = event.channel;
      
      event.channel.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          options.onDataChannelMessage?.(data);
        } catch (err) {
          console.error('Failed to parse data channel message:', err);
        }
      };
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      setIsConnected(pc.connectionState === 'connected');
      options.onConnectionStateChange?.(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.info('ICE connection state:', pc.iceConnectionState);
    };

    return pc;
  }, [options]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
    const pc = createPeerConnection();
    
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    return answer;
  }, [createPeerConnection]);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    }
  }, []);

  const sendData = useCallback((data: unknown) => {
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(data));
    }
  }, []);

  const close = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setConnectionState('new');
    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  return {
    connectionState,
    isConnected,
    stream: streamRef.current,
    handleOffer,
    addIceCandidate,
    sendData,
    close,
    peerConnection: peerConnectionRef.current,
  };
}
