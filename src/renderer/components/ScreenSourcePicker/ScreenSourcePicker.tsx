import { useState, useEffect, useCallback } from 'react';
import { PL } from '@shared/constants';
import './ScreenSourcePicker.scss';

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
}

interface ScreenSourcePickerProps {
  onSelect: (sourceId: string) => void;
}

function ScreenSourcePicker({ onSelect }: ScreenSourcePickerProps) {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getSources();
      setSources(result);
      // Auto-select first screen if available
      const firstScreen = result.find(s => s.id.startsWith('screen:'));
      if (firstScreen) {
        setSelectedId(firstScreen.id);
      }
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleConfirm = useCallback(() => {
    if (selectedId) {
      onSelect(selectedId);
    }
  }, [selectedId, onSelect]);

  const screens = sources.filter(s => s.id.startsWith('screen:'));
  const windows = sources.filter(s => s.id.startsWith('window:'));

  if (loading) {
    return (
      <div className="screen-source-picker">
        <div className="screen-source-picker__loading">
          <div className="screen-source-picker__spinner" />
          <p>{PL.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-source-picker">
      <h2 className="screen-source-picker__title">Wybierz zrodlo do udostepnienia</h2>
      
      {screens.length > 0 && (
        <div className="screen-source-picker__section">
          <h3 className="screen-source-picker__section-title">Ekrany</h3>
          <div className="screen-source-picker__grid">
            {screens.map(source => (
              <button
                key={source.id}
                className={`screen-source-picker__item ${selectedId === source.id ? 'screen-source-picker__item--selected' : ''}`}
                onClick={() => setSelectedId(source.id)}
              >
                <div className="screen-source-picker__thumbnail">
                  <img src={source.thumbnail} alt={source.name} />
                </div>
                <span className="screen-source-picker__name">{source.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {windows.length > 0 && (
        <div className="screen-source-picker__section">
          <h3 className="screen-source-picker__section-title">Okna aplikacji</h3>
          <div className="screen-source-picker__grid screen-source-picker__grid--windows">
            {windows.map(source => (
              <button
                key={source.id}
                className={`screen-source-picker__item ${selectedId === source.id ? 'screen-source-picker__item--selected' : ''}`}
                onClick={() => setSelectedId(source.id)}
              >
                <div className="screen-source-picker__thumbnail">
                  <img src={source.thumbnail} alt={source.name} />
                </div>
                <div className="screen-source-picker__window-info">
                  {source.appIcon && (
                    <img 
                      src={source.appIcon} 
                      alt="" 
                      className="screen-source-picker__app-icon"
                    />
                  )}
                  <span className="screen-source-picker__name">{source.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="screen-source-picker__actions">
        <button
          className="screen-source-picker__refresh"
          onClick={loadSources}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Odswiez
        </button>
        <button
          className="screen-source-picker__confirm"
          onClick={handleConfirm}
          disabled={!selectedId}
        >
          Rozpocznij udostepnianie
        </button>
      </div>
    </div>
  );
}

export default ScreenSourcePicker;
