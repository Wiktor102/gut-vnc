import { useRef, useEffect, useCallback, useState } from "react";
import { Annotation, AnnotationTool, Point } from "@shared/types";
import { generateId } from "@shared/utils";
import "./AnnotationCanvas.scss";

interface AnnotationCanvasProps {
	width: number;
	height: number;
	activeTool: AnnotationTool | null;
	activeColor: string;
	strokeWidth: number;
	annotations: Annotation[];
	pointerPosition: Point | null;
	isTeacher?: boolean;
	onAnnotationAdd?: (annotation: Annotation) => void;
	onPointerMove?: (position: Point | null) => void;
}

function AnnotationCanvas({
	width,
	height,
	activeTool,
	activeColor,
	strokeWidth,
	annotations,
	pointerPosition,
	isTeacher = false,
	onAnnotationAdd,
	onPointerMove
}: AnnotationCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
	const lastPointRef = useRef<Point | null>(null);

	// Draw all annotations
	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, width, height);

		// Draw existing annotations
		annotations.forEach(annotation => {
			drawAnnotation(ctx, annotation);
		});

		// Draw current drawing
		if (currentPoints.length > 0 && activeTool) {
			drawAnnotation(ctx, {
				id: "current",
				tool: activeTool,
				color: activeColor,
				strokeWidth,
				points: currentPoints,
				timestamp: Date.now()
			});
		}

		// Draw pointer
		if (pointerPosition) {
			drawPointer(ctx, pointerPosition);
		}
	}, [width, height, annotations, currentPoints, activeTool, activeColor, strokeWidth, pointerPosition]);

	const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
		ctx.strokeStyle = annotation.color;
		ctx.fillStyle = annotation.color;
		ctx.lineWidth = annotation.strokeWidth;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		const points = annotation.points;
		if (points.length === 0) return;

		switch (annotation.tool) {
			case "pen":
				ctx.beginPath();
				ctx.moveTo(points[0].x, points[0].y);
				for (let i = 1; i < points.length; i++) {
					ctx.lineTo(points[i].x, points[i].y);
				}
				ctx.stroke();
				break;

			case "arrow":
				if (points.length >= 2) {
					const start = points[0];
					const end = points[points.length - 1];

					// Draw line
					ctx.beginPath();
					ctx.moveTo(start.x, start.y);
					ctx.lineTo(end.x, end.y);
					ctx.stroke();

					// Draw arrowhead
					const angle = Math.atan2(end.y - start.y, end.x - start.x);
					const headLength = 20;

					ctx.beginPath();
					ctx.moveTo(end.x, end.y);
					ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
					ctx.moveTo(end.x, end.y);
					ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
					ctx.stroke();
				}
				break;

			case "rectangle":
				if (points.length >= 2) {
					const start = points[0];
					const end = points[points.length - 1];
					const rectWidth = end.x - start.x;
					const rectHeight = end.y - start.y;

					ctx.beginPath();
					ctx.strokeRect(start.x, start.y, rectWidth, rectHeight);
				}
				break;

			case "text":
				if (annotation.text && points.length > 0) {
					ctx.font = `${annotation.strokeWidth * 6}px sans-serif`;
					ctx.fillText(annotation.text, points[0].x, points[0].y);
				}
				break;

			case "pointer":
				// Pointer is drawn separately
				break;

			case "eraser":
				// Eraser clears area - handled differently
				break;
		}
	};

	const drawPointer = (ctx: CanvasRenderingContext2D, position: Point) => {
		const size = 20;

		// Draw red dot with glow effect
		ctx.beginPath();
		ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
		ctx.fill();

		ctx.beginPath();
		ctx.arc(position.x, position.y, size / 4, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(255, 0, 0, 1)";
		ctx.fill();
	};

	// Effect to redraw when dependencies change
	useEffect(() => {
		draw();
	}, [draw]);

	// Mouse/touch handlers
	const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		let clientX: number, clientY: number;

		if ("touches" in e) {
			clientX = e.touches[0].clientX;
			clientY = e.touches[0].clientY;
		} else {
			clientX = e.clientX;
			clientY = e.clientY;
		}

		return {
			x: (clientX - rect.left) * scaleX,
			y: (clientY - rect.top) * scaleY
		};
	}, []);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!isTeacher || !activeTool) return;

			const point = getCanvasPoint(e);
			setIsDrawing(true);
			setCurrentPoints([point]);
			lastPointRef.current = point;
		},
		[isTeacher, activeTool, getCanvasPoint]
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			const point = getCanvasPoint(e);

			// Update pointer position for teacher
			if (isTeacher && activeTool === "pointer") {
				onPointerMove?.(point);
				return;
			}

			if (!isDrawing || !activeTool) return;

			// Add point to current drawing
			setCurrentPoints(prev => [...prev, point]);
		},
		[isTeacher, isDrawing, activeTool, getCanvasPoint, onPointerMove]
	);

	const handleMouseUp = useCallback(() => {
		if (!isDrawing || !activeTool || currentPoints.length === 0) {
			setIsDrawing(false);
			setCurrentPoints([]);
			return;
		}

		// Create annotation
		const annotation: Annotation = {
			id: generateId(),
			tool: activeTool,
			color: activeColor,
			strokeWidth,
			points: currentPoints,
			timestamp: Date.now()
		};

		onAnnotationAdd?.(annotation);
		setIsDrawing(false);
		setCurrentPoints([]);
		lastPointRef.current = null;
	}, [isDrawing, activeTool, activeColor, strokeWidth, currentPoints, onAnnotationAdd]);

	const handleMouseLeave = useCallback(() => {
		if (isTeacher && activeTool === "pointer") {
			onPointerMove?.(null);
		}

		if (isDrawing) {
			handleMouseUp();
		}
	}, [isTeacher, activeTool, isDrawing, onPointerMove, handleMouseUp]);

	return (
		<canvas
			ref={canvasRef}
			className={`annotation-canvas ${isTeacher && activeTool ? "annotation-canvas--active" : ""}`}
			width={width}
			height={height}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseLeave}
		/>
	);
}

export default AnnotationCanvas;
