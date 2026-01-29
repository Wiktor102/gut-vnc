import { useState, useCallback, useRef, useEffect } from "react";

interface CaptureOptions {
	frameRate?: number;
	width?: number;
	height?: number;
}

export function useScreenCapture() {
	const [isCapturing, setIsCapturing] = useState(false);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const startCapture = useCallback(async (sourceId: string, options: CaptureOptions = {}): Promise<MediaStream | null> => {
		const { frameRate = 30, width = 1920, height = 1080 } = options;

		try {
			setError(null);

			// Use navigator.mediaDevices.getUserMedia with chromeMediaSource
			const constraints: MediaStreamConstraints = {
				audio: false,
				video: {
					// @ts-expect-error - Electron specific constraint
					mandatory: {
						chromeMediaSource: "desktop",
						chromeMediaSourceId: sourceId,
						maxWidth: width,
						maxHeight: height,
						maxFrameRate: frameRate
					}
				}
			};

			const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

			streamRef.current = mediaStream;
			setStream(mediaStream);
			setIsCapturing(true);

			return mediaStream;
		} catch (err) {
			console.error("Failed to start screen capture:", err);
			setError("Nie udalo sie uruchomic przechwytywania ekranu");
			return null;
		}
	}, []);

	const stopCapture = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => {
				track.stop();
			});
			streamRef.current = null;
		}

		setStream(null);
		setIsCapturing(false);
	}, []);

	const getVideoTrack = useCallback((): MediaStreamTrack | null => {
		return streamRef.current?.getVideoTracks()[0] || null;
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopCapture();
		};
	}, [stopCapture]);

	return {
		isCapturing,
		stream,
		error,
		startCapture,
		stopCapture,
		getVideoTrack
	};
}
