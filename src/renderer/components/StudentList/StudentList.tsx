import { Student } from '@shared/types';
import { PL } from '@shared/constants';
import ReactionBadge from '../ReactionBadge/ReactionBadge';
import './StudentList.scss';

interface StudentListProps {
  students: Student[];
  onKick?: (studentId: string) => void;
  showKickButton?: boolean;
}

function StudentList({ students, onKick, showKickButton = true }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="student-list student-list--empty">
        <p>{PL.noStudents}</p>
        <span>{PL.waitingForStudents}</span>
      </div>
    );
  }

  return (
    <ul className="student-list">
      {students.map(student => (
        <li key={student.id} className="student-list__item">
          <div className="student-list__avatar">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="student-list__info">
            <span className="student-list__name">{student.name}</span>
            {student.reaction && (
              <ReactionBadge reaction={student.reaction} size="small" />
            )}
          </div>
          <div className="student-list__status">
            <span className={`student-list__indicator ${student.connected ? 'student-list__indicator--online' : 'student-list__indicator--offline'}`} />
          </div>
          {showKickButton && onKick && (
            <button
              className="student-list__kick"
              onClick={() => onKick(student.id)}
              title={PL.kickStudent}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default StudentList;
