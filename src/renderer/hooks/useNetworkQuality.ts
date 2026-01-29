import { useState, useEffect, useCallback, useRef } from "react";
import { CAPTURE_CONFIG } from "@shared/constants";

interface NetworkQuality {
	rtt: number;
	packetLoss: number;
	bandwidth: number;
	quality: "excellent" | "good" | "poor" | "bad";
}

interface AdaptiveSettings {
	maxBitrate: number;
	maxFramerate: number;
	scaleResolutionDownBy: number;
}

const QUALITY_THRESHOLDS = {
	excellent: { maxRtt: 50, maxPacketLoss: 0.01 },
	good: { maxRtt: 150, maxPacketLoss: 0.03 },
	poor: { maxRtt: 300, maxPacketLoss: 0.08 }
	// anything worse is 'bad'
};

const ADAPTIVE_PRESETS: Record<NetworkQuality["quality"], AdaptiveSettings> = {
	excellent: {
		maxBitrate: CAPTURE_CONFIG.maxBitrate,
		maxFramerate: CAPTURE_CONFIG.maxFrameRate,
		scaleResolutionDownBy: 1
	},
	good: {
		maxBitrate: CAPTURE_CONFIG.maxBitrate * 0.7,
		maxFramerate: 24,
		scaleResolutionDownBy: 1
	},
	poor: {
		maxBitrate: CAPTURE_CONFIG.maxBitrate * 0.4,
		maxFramerate: 15,
		scaleResolutionDownBy: 1.5
	},
	bad: {
		maxBitrate: CAPTURE_CONFIG.minBitrate,
		maxFramerate: 10,
		scaleResolutionDownBy: 2
	}
};

export function useNetworkQuality(peerConnection: RTCPeerConnection | null) {
	const [quality, setQuality] = useState<NetworkQuality>({
		rtt: 0,
		packetLoss: 0,
		bandwidth: 0,
		quality: "good"
	});
	const [adaptiveSettings, setAdaptiveSettings] = useState<AdaptiveSettings>(ADAPTIVE_PRESETS.good);

	const previousPacketsLostRef = useRef(0);
	const previousPacketsReceivedRef = useRef(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const calculateQuality = useCallback((rtt: number, packetLoss: number): NetworkQuality["quality"] => {
		if (rtt <= QUALITY_THRESHOLDS.excellent.maxRtt && packetLoss <= QUALITY_THRESHOLDS.excellent.maxPacketLoss) {
			return "excellent";
		}
		if (rtt <= QUALITY_THRESHOLDS.good.maxRtt && packetLoss <= QUALITY_THRESHOLDS.good.maxPacketLoss) {
			return "good";
		}
		if (rtt <= QUALITY_THRESHOLDS.poor.maxRtt && packetLoss <= QUALITY_THRESHOLDS.poor.maxPacketLoss) {
			return "poor";
		}
		return "bad";
	}, []);

	const collectStats = useCallback(async () => {
		if (!peerConnection) return;

		try {
			const stats = await peerConnection.getStats();

			let rtt = 0;
			let packetsLost = 0;
			let packetsReceived = 0;
			let bytesReceived = 0;

			stats.forEach(report => {
				if (report.type === "candidate-pair" && report.state === "succeeded") {
					rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
				}

				if (report.type === "inbound-rtp" && report.kind === "video") {
					packetsLost = report.packetsLost || 0;
					packetsReceived = report.packetsReceived || 0;
					bytesReceived = report.bytesReceived || 0;
				}
			});

			// Calculate packet loss rate since last check
			const deltaPacketsLost = packetsLost - previousPacketsLostRef.current;
			const deltaPacketsReceived = packetsReceived - previousPacketsReceivedRef.current;
			const totalDeltaPackets = deltaPacketsLost + deltaPacketsReceived;
			const packetLoss = totalDeltaPackets > 0 ? deltaPacketsLost / totalDeltaPackets : 0;

			previousPacketsLostRef.current = packetsLost;
			previousPacketsReceivedRef.current = packetsReceived;

			const qualityLevel = calculateQuality(rtt, packetLoss);

			setQuality({
				rtt,
				packetLoss,
				bandwidth: bytesReceived,
				quality: qualityLevel
			});

			setAdaptiveSettings(ADAPTIVE_PRESETS[qualityLevel]);
		} catch (err) {
			console.error("Failed to collect WebRTC stats:", err);
		}
	}, [peerConnection, calculateQuality]);

	// Start/stop stats collection based on peer connection
	useEffect(() => {
		if (peerConnection) {
			// Collect stats every 2 seconds
			intervalRef.current = setInterval(collectStats, 2000);
			collectStats(); // Initial collection
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [peerConnection, collectStats]);

	return {
		quality,
		adaptiveSettings,
		isExcellent: quality.quality === "excellent",
		isGood: quality.quality === "good" || quality.quality === "excellent",
		isPoor: quality.quality === "poor",
		isBad: quality.quality === "bad"
	};
}
