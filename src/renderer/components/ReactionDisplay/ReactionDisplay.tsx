import { useReactions } from '../../context/ReactionsContext';
import ReactionBadge from '../ReactionBadge/ReactionBadge';
import './ReactionDisplay.scss';

interface ReactionDisplayProps {
  showNames?: boolean;
}

function ReactionDisplay({ showNames = false }: ReactionDisplayProps) {
  const { getActiveReactions } = useReactions();
  const reactions = getActiveReactions();

  if (reactions.length === 0) {
    return (
      <div className="reaction-display reaction-display--empty">
        <p>Brak aktywnych reakcji</p>
      </div>
    );
  }

  return (
    <div className="reaction-display">
      {reactions.map(entry => (
        <div key={entry.studentId} className="reaction-display__item">
          {showNames && (
            <span className="reaction-display__name">{entry.studentName}</span>
          )}
          <ReactionBadge reaction={entry.reaction} size="medium" />
        </div>
      ))}
    </div>
  );
}

export default ReactionDisplay;
