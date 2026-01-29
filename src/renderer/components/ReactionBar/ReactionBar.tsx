import { ReactionType } from "@shared/types";
import { PL } from "@shared/constants";
import "./ReactionBar.scss";

interface ReactionBarProps {
	currentReaction: ReactionType;
	onReaction: (reaction: ReactionType) => void;
}

const REACTIONS: { type: Exclude<ReactionType, null>; icon: string; label: string }[] = [
	{ type: "hand", icon: "\u{1F44B}", label: PL.raiseHand },
	{ type: "thumbsUp", icon: "\u{1F44D}", label: PL.thumbsUp },
	{ type: "question", icon: "\u{2753}", label: PL.question },
	{ type: "confused", icon: "\u{1F615}", label: PL.confused }
];

function ReactionBar({ currentReaction, onReaction }: ReactionBarProps) {
	return (
		<div className="reaction-bar">
			<div className="reaction-bar__container">
				<span className="reaction-bar__label">{PL.reactions}:</span>

				<div className="reaction-bar__buttons">
					{REACTIONS.map(({ type, icon, label }) => (
						<button
							key={type}
							className={`reaction-bar__btn ${currentReaction === type ? "reaction-bar__btn--active" : ""}`}
							onClick={() => onReaction(type)}
							title={label}
						>
							<span className="reaction-bar__icon">{icon}</span>
							<span className="reaction-bar__btn-label">{label}</span>
						</button>
					))}
				</div>

				{currentReaction && (
					<button className="reaction-bar__clear" onClick={() => onReaction(null)}>
						{PL.clearMyReaction}
					</button>
				)}
			</div>
		</div>
	);
}

export default ReactionBar;
