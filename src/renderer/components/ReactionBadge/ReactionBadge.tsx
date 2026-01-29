import { ReactionType } from "@shared/types";
import "./ReactionBadge.scss";

interface ReactionBadgeProps {
	reaction: ReactionType;
	size?: "small" | "medium" | "large";
	showLabel?: boolean;
}

const REACTION_ICONS: Record<Exclude<ReactionType, null>, string> = {
	hand: "\u{1F44B}", // Waving hand
	thumbsUp: "\u{1F44D}", // Thumbs up
	question: "\u{2753}", // Question mark
	confused: "\u{1F615}" // Confused face
};

const REACTION_LABELS: Record<Exclude<ReactionType, null>, string> = {
	hand: "Reka",
	thumbsUp: "OK",
	question: "Pytanie",
	confused: "Nie rozumiem"
};

function ReactionBadge({ reaction, size = "medium", showLabel = false }: ReactionBadgeProps) {
	if (!reaction) return null;

	return (
		<span className={`reaction-badge reaction-badge--${size} reaction-badge--${reaction}`}>
			<span className="reaction-badge__icon">{REACTION_ICONS[reaction]}</span>
			{showLabel && <span className="reaction-badge__label">{REACTION_LABELS[reaction]}</span>}
		</span>
	);
}

export default ReactionBadge;
