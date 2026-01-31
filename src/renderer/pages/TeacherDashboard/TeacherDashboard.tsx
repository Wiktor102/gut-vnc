import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useConnection } from "../../context/ConnectionContext";
import { useReactions } from "../../context/ReactionsContext";
import { PL, DEFAULT_PORT } from "@shared/constants";
import { ScreenMode } from "@shared/types";
import { useScreenCapture } from "../../hooks/useScreenCapture";
import ScreenSourcePicker from "../../components/ScreenSourcePicker/ScreenSourcePicker";
import StudentList from "../../components/StudentList/StudentList";
import ReactionDisplay from "../../components/ReactionDisplay/ReactionDisplay";
import TeacherControls from "../../components/TeacherControls/TeacherControls";
import AnnotationToolbar from "../../components/AnnotationToolbar/AnnotationToolbar";
import ConnectionStatus from "../../components/ConnectionStatus/ConnectionStatus";
import ScreenViewer from "../../components/ScreenViewer/ScreenViewer";
import { destroyStreamingService, getStreamingService } from "../../services/StreamingService";
import "./TeacherDashboard.scss";

type SetupStep = "config" | "source" | "streaming";

interface TeacherDashboardProps {}

function TeacherDashboard(props: TeacherDashboardProps) {
	const navigate = useNavigate();
	const { isConnected, setConnected, setConnecting, students, setError, error } = useConnection();
	const { clearAllReactions } = useReactions();

	const streamingService = useMemo(() => getStreamingService(), []);
	const offeredStudentsRef = useRef<Set<string>>(new Set());
	const {
		isCapturing,
		stream: captureStream,
		error: captureError,
		startCapture: startLocalCapture,
		stopCapture: stopLocalCapture
	} = useScreenCapture();

	const [step, setStep] = useState<SetupStep>("config");
	const [teacherName, setTeacherName] = useState("");
	const [roomName, setRoomName] = useState("");
	const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
	const [screenMode, setScreenMode] = useState<ScreenMode>("live");
	const [localIPs, setLocalIPs] = useState<Array<{ address: string; name: string; internal: boolean }>>([]);
	const [selectedIP, setSelectedIP] = useState<string>("");

	useEffect(() => {
		if (captureError) setError(captureError);
	}, [captureError, setError]);

	// Wire StreamingService -> signaling messages
	useEffect(() => {
		const onIceCandidate = (payload: unknown) => {
			const msg = payload as { studentId?: string; candidate?: unknown };
			if (!msg.studentId || !msg.candidate) return;
			void window.electronAPI.signalingSendTo(msg.studentId, {
				type: "ice-candidate",
				candidate: msg.candidate,
				timestamp: Date.now()
			});
		};

		streamingService.on("ice-candidate", onIceCandidate);
		return () => {
			streamingService.off("ice-candidate", onIceCandidate);
		};
	}, [streamingService]);

	// Handle answers / ICE coming back from students (forwarded from main)
	useEffect(() => {
		const cleanup = window.electronAPI.onSignalingMessage(message => {
			const m = message as { type?: string; studentId?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
			if (!m.type || !m.studentId) return;

			if (m.type === "answer" && m.sdp) {
				void streamingService.handleAnswer(m.studentId, m.sdp);
			}
			if (m.type === "ice-candidate" && m.candidate) {
				void streamingService.handleIceCandidate(m.studentId, m.candidate);
			}
		});
		return () => cleanup();
	}, [streamingService]);

	const sendOfferToStudent = useCallback(
		async (studentId: string) => {
			if (offeredStudentsRef.current.has(studentId)) return;
			if (!captureStream) return;

			try {
				const offer = await streamingService.createOffer(studentId);
				await window.electronAPI.signalingSendTo(studentId, {
					type: "offer",
					sdp: offer,
					timestamp: Date.now()
				});
				offeredStudentsRef.current.add(studentId);
			} catch (err) {
				console.error("Failed to create/send offer:", err);
			}
		},
		[captureStream, streamingService]
	);

	// Whenever we have a stream and a student list, ensure offers are sent.
	useEffect(() => {
		if (!captureStream) return;
		for (const student of students) {
			void sendOfferToStudent(student.id);
		}
	}, [students, captureStream, sendOfferToStudent]);

	// If a student leaves, allow re-offer on reconnect and close their peer.
	useEffect(() => {
		const activeIds = new Set(students.map(s => s.id));
		for (const offeredId of Array.from(offeredStudentsRef.current)) {
			if (!activeIds.has(offeredId)) {
				offeredStudentsRef.current.delete(offeredId);
				streamingService.closePeer(offeredId);
			}
		}
	}, [students, streamingService]);

	// Get local IPs for display
	useEffect(() => {
		window.electronAPI.getLocalIPs().then(ips => {
			setLocalIPs(ips);

			const preferred =
				ips.find(ip => !ip.internal && ip.address.startsWith("192.168.")) ||
				ips.find(ip => !ip.internal && !ip.address.startsWith("127.")) ||
				ips.find(ip => !ip.address.startsWith("127.")) ||
				ips[0];

			// Only auto-set when empty or currently loopback.
			setSelectedIP(prev => {
				if (prev && !prev.startsWith("127.")) return prev;
				return preferred?.address || prev;
			});
		});
	}, []);

	const handleStartSession = useCallback(async () => {
		if (!teacherName.trim() || !roomName.trim()) {
			setError("Wypelnij wszystkie pola");
			return;
		}

		if (!selectedIP) {
			setError("Wybierz adres sieciowy");
			return;
		}

		setConnecting(true);
		setError(null);

		try {
			const result = await window.electronAPI.startTeacherSession({
				teacherName: teacherName.trim(),
				roomName: roomName.trim(),
				port: DEFAULT_PORT,
				address: selectedIP
			});

			if (result.success) {
				setStep("source");
			} else {
				setError(result.error || "Nie udalo sie uruchomic sesji");
			}
		} catch (err) {
			setError("Blad podczas uruchamiania sesji");
		} finally {
			setConnecting(false);
		}
	}, [teacherName, roomName, selectedIP, setConnecting, setError]);

	const handleSourceSelected = useCallback(
		async (sourceId: string) => {
			setSelectedSourceId(sourceId);

			try {
				setError(null);
				const mediaStream = await startLocalCapture(sourceId, { frameRate: 15 });
				if (!mediaStream) {
					setError("Nie udalo sie uruchomic przechwytywania ekranu");
					return;
				}

				streamingService.setLocalStream(mediaStream);
				setConnected(true);
				setStep("streaming");
			} catch (err) {
				console.error("Failed to start local capture:", err);
				setError("Blad podczas uruchamiania przechwytywania");
			}
		},
		[setConnected, setError, startLocalCapture, streamingService]
	);

	const handleStopSession = useCallback(async () => {
		try {
			offeredStudentsRef.current.clear();
			stopLocalCapture();
			destroyStreamingService();
			await window.electronAPI.stopTeacherSession();
			setConnected(false);
			clearAllReactions();
			navigate("/");
		} catch (err) {
			console.error("Error stopping session:", err);
		}
	}, [setConnected, clearAllReactions, navigate, stopLocalCapture]);

	const handleClearReactions = useCallback(async () => {
		try {
			await window.electronAPI.clearReactions();
			clearAllReactions();
		} catch (err) {
			console.error("Error clearing reactions:", err);
		}
	}, [clearAllReactions]);

	const handleScreenModeChange = useCallback((mode: ScreenMode) => {
		setScreenMode(mode);
		// Broadcast screen mode change to students
		window.electronAPI.signalingBroadcast({
			type: "screen-mode",
			mode,
			timestamp: Date.now()
		});
	}, []);

	const handleKickStudent = useCallback(async (studentId: string) => {
		try {
			await window.electronAPI.kickStudent(studentId, "Usuniety przez nauczyciela");
		} catch (err) {
			console.error("Error kicking student:", err);
		}
	}, []);

	// Config step
	if (step === "config") {
		return (
			<div className="teacher-dashboard">
				<div className="teacher-dashboard__setup">
					<button className="teacher-dashboard__back" onClick={() => navigate("/")}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M19 12H5M12 19l-7-7 7-7" />
						</svg>
						{PL.cancel}
					</button>

					<div className="teacher-dashboard__setup-card">
						<h1 className="teacher-dashboard__title">{PL.startSession}</h1>

						<div className="teacher-dashboard__form">
							<div className="teacher-dashboard__field">
								<label htmlFor="teacherName">{PL.yourName}</label>
								<input
									id="teacherName"
									type="text"
									value={teacherName}
									onChange={e => setTeacherName(e.target.value)}
									placeholder={PL.enterYourName}
									autoFocus
								/>
							</div>

							<div className="teacher-dashboard__field">
								<label htmlFor="roomName">{PL.roomName}</label>
								<input
									id="roomName"
									type="text"
									value={roomName}
									onChange={e => setRoomName(e.target.value)}
									placeholder={PL.enterRoomName}
								/>
							</div>

							{localIPs.length > 0 && (
								<div className="teacher-dashboard__field">
									<label htmlFor="networkIP">Adres sieciowy</label>
									<select
										id="networkIP"
										value={selectedIP}
										onChange={e => setSelectedIP(e.target.value)}
										className="teacher-dashboard__select"
									>
										{localIPs.map(ip => (
											<option key={ip.address} value={ip.address}>
												{ip.address} ({ip.name}){ip.internal ? " - Loopback" : ""}
											</option>
										))}
									</select>
									<span className="teacher-dashboard__help-text">
										Wybierz interfejs sieciowy, ktory bedzie uzywany do polaczen
									</span>
								</div>
							)}

							{error && <div className="teacher-dashboard__error">{error}</div>}

							<button
								className="teacher-dashboard__submit"
								onClick={handleStartSession}
								disabled={!teacherName.trim() || !roomName.trim() || !selectedIP}
							>
								{PL.startSession}
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Source selection step
	if (step === "source") {
		return (
			<div className="teacher-dashboard">
				<div className="teacher-dashboard__setup">
					<button className="teacher-dashboard__back" onClick={() => setStep("config")}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M19 12H5M12 19l-7-7 7-7" />
						</svg>
						Wstecz
					</button>

					<ScreenSourcePicker onSelect={handleSourceSelected} />
				</div>
			</div>
		);
	}

	// Streaming step
	return (
		<div className="teacher-dashboard teacher-dashboard--streaming">
			<header className="teacher-dashboard__header">
				<div className="teacher-dashboard__header-left">
					<h1 className="teacher-dashboard__room-name">{roomName}</h1>
					<ConnectionStatus />
				</div>
				<div className="teacher-dashboard__header-right">
					<button className="teacher-dashboard__stop-btn" onClick={handleStopSession}>
						{PL.stopSession}
					</button>
				</div>
			</header>

			<div className="teacher-dashboard__main">
				<div className="teacher-dashboard__preview">
					<div className="teacher-dashboard__preview-header">
						<span>Podglad ekranu</span>
						<span className={`teacher-dashboard__mode teacher-dashboard__mode--${screenMode}`}>
							{screenMode === "live" && "Na zywo"}
							{screenMode === "paused" && PL.screenPaused}
							{screenMode === "blank" && PL.screenBlank}
						</span>
					</div>
					<div className="teacher-dashboard__preview-content">
						{screenMode === "blank" ? (
							<div className="teacher-dashboard__blank-message">{PL.breakMessage}</div>
						) : captureStream ? (
							<ScreenViewer
								stream={captureStream}
								screenMode={screenMode}
								annotations={[]}
								pointerPosition={null}
								showAnnotations={false}
							/>
						) : (
							<div className="teacher-dashboard__preview-placeholder">
								<p>{isCapturing ? "Uruchamianie podgladu..." : "Brak podgladu ekranu"}</p>
								<p className="teacher-dashboard__student-count">
									{students.length} {students.length === 1 ? "uczen" : "uczniow"} polaczonych
								</p>
							</div>
						)}
					</div>
				</div>

				<aside className="teacher-dashboard__sidebar">
					<TeacherControls screenMode={screenMode} onScreenModeChange={handleScreenModeChange} />

					<AnnotationToolbar />

					<div className="teacher-dashboard__students-section">
						<div className="teacher-dashboard__section-header">
							<h2>{PL.studentsConnected}</h2>
							<span className="teacher-dashboard__count">{students.length}</span>
						</div>
						<StudentList students={students} onKick={handleKickStudent} />
					</div>

					<div className="teacher-dashboard__reactions-section">
						<div className="teacher-dashboard__section-header">
							<h2>{PL.reactions}</h2>
							<button className="teacher-dashboard__clear-btn" onClick={handleClearReactions}>
								{PL.clearReactions}
							</button>
						</div>
						<ReactionDisplay showNames />
					</div>
				</aside>
			</div>
		</div>
	);
}

export default TeacherDashboard;
