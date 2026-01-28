import { ScreenMode } from '@shared/types';
import { PL } from '@shared/constants';
import './TeacherControls.scss';

interface TeacherControlsProps {
  screenMode: ScreenMode;
  onScreenModeChange: (mode: ScreenMode) => void;
}

function TeacherControls({ screenMode, onScreenModeChange }: TeacherControlsProps) {
  return (
    <div className="teacher-controls">
      <h3 className="teacher-controls__title">{PL.screenControls}</h3>
      
      <div className="teacher-controls__buttons">
        <button
          className={`teacher-controls__btn ${screenMode === 'live' ? 'teacher-controls__btn--active' : ''}`}
          onClick={() => onScreenModeChange('live')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10,8 16,12 10,16" fill="currentColor" />
          </svg>
          Na zywo
        </button>
        
        <button
          className={`teacher-controls__btn ${screenMode === 'paused' ? 'teacher-controls__btn--active teacher-controls__btn--warning' : ''}`}
          onClick={() => onScreenModeChange('paused')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="10" y1="8" x2="10" y2="16" strokeWidth="3" />
            <line x1="14" y1="8" x2="14" y2="16" strokeWidth="3" />
          </svg>
          {PL.pauseScreen}
        </button>
        
        <button
          className={`teacher-controls__btn ${screenMode === 'blank' ? 'teacher-controls__btn--active teacher-controls__btn--muted' : ''}`}
          onClick={() => onScreenModeChange('blank')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <line x1="2" y1="3" x2="22" y2="17" />
          </svg>
          {PL.blankScreen}
        </button>
      </div>
    </div>
  );
}

export default TeacherControls;
