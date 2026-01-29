import { useRef, useEffect, useState, useCallback } from "react";
import { Annotation, Point, ScreenMode } from "@shared/types";
import { PL } from "@shared/constants";
import AnnotationCanvas from "../AnnotationCanvas/AnnotationCanvas";
import "./ScreenViewer.scss";

interface ScreenViewerProps {
	stream: MediaStream | null;
	screenMode: ScreenMode;
	blankMessage?: string;
	annotations: Annotation[];
	pointerPosition: Point | null;
	showAnnotations?: boolean;
	onResize?: (width: number, height: number) => void;
}

function ScreenViewer({
	stream,
	screenMode,
	blankMessage,
	annotations,
	pointerPosition,
	showAnnotations = true,
	onResize
}: ScreenViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
	const [isPlaying, setIsPlaying] = useState(false);

	// Update video source when stream changes
	useEffect(() => {
		if (videoRef.current && stream) {
			videoRef.current.srcObject = stream;
			videoRef.current.play().catch(err => {
				console.error("Failed to play video:", err);
			});
		}
	}, [stream]);

	// Handle video metadata loaded
	const handleLoadedMetadata = useCallback(() => {
		if (videoRef.current) {
			const { videoWidth, videoHeight } = videoRef.current;
			setDimensions({ width: videoWidth, height: videoHeight });
			onResize?.(videoWidth, videoHeight);
		}
	}, [onResize]);

	// Handle play state
	const handlePlay = useCallback(() => {
		setIsPlaying(true);
	}, []);

	const handlePause = useCallback(() => {
		setIsPlaying(false);
	}, []);

	// Handle resize
	useEffect(() => {
		const handleResize = () => {
			if (containerRef.current) {
				const { clientWidth, clientHeight } = containerRef.current;
				// Maintain aspect ratio
				const aspectRatio = dimensions.width / dimensions.height;
				let newWidth = clientWidth;
				let newHeight = clientWidth / aspectRatio;

				if (newHeight > clientHeight) {
					newHeight = clientHeight;
					newWidth = clientHeight * aspectRatio;
				}

				// Update canvas size if needed
			}
		};

		window.addEventListener("resize", handleResize);
		handleResize();

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, [dimensions]);

	// Blank screen
	if (screenMode === "blank") {
		return (
			<div className="screen-viewer screen-viewer--blank" ref={containerRef}>
				<div className="screen-viewer__overlay">
					<span className="screen-viewer__message">{blankMessage || PL.breakMessage}</span>
				</div>
			</div>
		);
	}

	// Paused screen
	if (screenMode === "paused") {
		return (
			<div className="screen-viewer screen-viewer--paused" ref={containerRef}>
				<video
					ref={videoRef}
					className="screen-viewer__video screen-viewer__video--paused"
					autoPlay
					playsInline
					muted
					onLoadedMetadata={handleLoadedMetadata}
					onPlay={handlePlay}
					onPause={handlePause}
				/>
				<div className="screen-viewer__overlay screen-viewer__overlay--paused">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="10" y1="8" x2="10" y2="16" strokeWidth="3" />
						<line x1="14" y1="8" x2="14" y2="16" strokeWidth="3" />
					</svg>
					<span>{PL.screenPaused}</span>
				</div>
			</div>
		);
	}

	// Live screen
	return (
		<div className="screen-viewer" ref={containerRef}>
			<video
				ref={videoRef}
				className="screen-viewer__video"
				autoPlay
				playsInline
				muted
				onLoadedMetadata={handleLoadedMetadata}
				onPlay={handlePlay}
				onPause={handlePause}
			/>

			{showAnnotations && (
				<AnnotationCanvas
					width={dimensions.width}
					height={dimensions.height}
					activeTool={null}
					activeColor="#ff0000"
					strokeWidth={3}
					annotations={annotations}
					pointerPosition={pointerPosition}
					isTeacher={false}
				/>
			)}

			{!isPlaying && stream && (
				<div className="screen-viewer__loading">
					<div className="screen-viewer__spinner" />
					<span>{PL.loading}</span>
				</div>
			)}

			{!stream && (
				<div className="screen-viewer__no-stream">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<rect x="2" y="3" width="20" height="14" rx="2" />
						<line x1="8" y1="21" x2="16" y2="21" />
						<line x1="12" y1="17" x2="12" y2="21" />
					</svg>
					<span>Oczekiwanie na strumien...</span>
				</div>
			)}
		</div>
	);
}

export default ScreenViewer;
