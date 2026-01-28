import { useState, useCallback, useEffect, useRef } from 'react';

interface TeacherInfo {
  name: string;
  roomName: string;
  address: string;
  port: number;
}

interface UseDiscoveryOptions {
  autoStart?: boolean;
  refreshInterval?: number;
}

export function useDiscovery(options: UseDiscoveryOptions = {}) {
  const { autoStart = false, refreshInterval = 5000 } = options;
  
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const discover = useCallback(async () => {
    setIsSearching(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.discoverTeachers();
      
      if (result.success) {
        setTeachers(result.teachers);
      } else {
        setError(result.error || 'Blad podczas wyszukiwania');
      }
    } catch (err) {
      setError('Blad podczas wyszukiwania nauczycieli');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const startContinuousDiscovery = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    discover();
    intervalRef.current = setInterval(discover, refreshInterval);
  }, [discover, refreshInterval]);

  const stopDiscovery = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    try {
      await window.electronAPI.stopDiscovery();
    } catch (err) {
      console.error('Failed to stop discovery:', err);
    }
    
    setIsSearching(false);
  }, []);

  const refresh = useCallback(() => {
    setTeachers([]);
    discover();
  }, [discover]);

  // Auto start if enabled
  useEffect(() => {
    if (autoStart) {
      startContinuousDiscovery();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoStart, startContinuousDiscovery]);

  return {
    teachers,
    isSearching,
    error,
    discover,
    startContinuousDiscovery,
    stopDiscovery,
    refresh,
  };
}
