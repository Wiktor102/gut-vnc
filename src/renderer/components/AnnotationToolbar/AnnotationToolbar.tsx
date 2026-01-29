import { useState, useCallback } from "react";
import { AnnotationTool } from "@shared/types";
import { PL, ANNOTATION_COLORS } from "@shared/constants";
import "./AnnotationToolbar.scss";

interface AnnotationToolbarProps {
	onToolChange?: (tool: AnnotationTool | null) => void;
	onColorChange?: (color: string) => void;
	onClear?: () => void;
}

function AnnotationToolbar({ onToolChange, onColorChange, onClear }: AnnotationToolbarProps) {
	const [activeTool, setActiveTool] = useState<AnnotationTool | null>(null);
	const [activeColor, setActiveColor] = useState(ANNOTATION_COLORS[0]);
	const [showColors, setShowColors] = useState(false);

	const handleToolClick = useCallback(
		(tool: AnnotationTool) => {
			const newTool = activeTool === tool ? null : tool;
			setActiveTool(newTool);
			onToolChange?.(newTool);
		},
		[activeTool, onToolChange]
	);

	const handleColorClick = useCallback(
		(color: string) => {
			setActiveColor(color);
			setShowColors(false);
			onColorChange?.(color);
		},
		[onColorChange]
	);

	const tools: { id: AnnotationTool; icon: JSX.Element; label: string }[] = [
		{
			id: "pointer",
			icon: (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
				</svg>
			),
			label: PL.pointer
		},
		{
			id: "pen",
			icon: (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M12 19l7-7 3 3-7 7-3-3z" />
					<path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
					<path d="M2 2l7.586 7.586" />
					<circle cx="11" cy="11" r="2" />
				</svg>
			),
			label: PL.pen
		},
		{
			id: "arrow",
			icon: (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<line x1="5" y1="12" x2="19" y2="12" />
					<polyline points="12,5 19,12 12,19" />
				</svg>
			),
			label: PL.arrow
		},
		{
			id: "rectangle",
			icon: (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<rect x="3" y="3" width="18" height="18" rx="2" />
				</svg>
			),
			label: PL.rectangle
		},
		{
			id: "text",
			icon: (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<polyline points="4,7 4,4 20,4 20,7" />
					<line x1="9" y1="20" x2="15" y2="20" />
					<line x1="12" y1="4" x2="12" y2="20" />
				</svg>
			),
			label: PL.text
		},
		{
			id: "eraser",
			icon: (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M20 20H7L3 16c-1-1-1-3 0-4l9-9c1-1 3-1 4 0l7 7c1 1 1 3 0 4l-6 6" />
					<path d="M6.5 17.5L17 7" />
				</svg>
			),
			label: PL.eraser
		}
	];

	return (
		<div className="annotation-toolbar">
			<h3 className="annotation-toolbar__title">{PL.annotations}</h3>

			<div className="annotation-toolbar__tools">
				{tools.map(tool => (
					<button
						key={tool.id}
						className={`annotation-toolbar__tool ${activeTool === tool.id ? "annotation-toolbar__tool--active" : ""}`}
						onClick={() => handleToolClick(tool.id)}
						title={tool.label}
					>
						{tool.icon}
					</button>
				))}

				<div className="annotation-toolbar__divider" />

				<div className="annotation-toolbar__color-picker">
					<button
						className="annotation-toolbar__color-btn"
						onClick={() => setShowColors(!showColors)}
						style={{ backgroundColor: activeColor }}
						title="Kolor"
					/>

					{showColors && (
						<div className="annotation-toolbar__colors">
							{ANNOTATION_COLORS.map(color => (
								<button
									key={color}
									className={`annotation-toolbar__color ${activeColor === color ? "annotation-toolbar__color--active" : ""}`}
									style={{ backgroundColor: color }}
									onClick={() => handleColorClick(color)}
								/>
							))}
						</div>
					)}
				</div>

				<button className="annotation-toolbar__clear" onClick={onClear} title={PL.clearAnnotations}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<polyline points="3,6 5,6 21,6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
				</button>
			</div>
		</div>
	);
}

export default AnnotationToolbar;
