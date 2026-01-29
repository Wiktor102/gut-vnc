import { useState, useCallback, useEffect } from "react";
import { useConnection } from "../../context/ConnectionContext";
import { useReactions } from "../../context/ReactionsContext";
import { PL, DEFAULT_PORT } from "@shared/constants";
import { ScreenMode } from "@shared/types";
import ScreenSourcePicker from "../../components/ScreenSourcePicker/ScreenSourcePicker";
import StudentList from "../../components/StudentList/StudentList";
import ReactionDisplay from "../../components/ReactionDisplay/ReactionDisplay";
import TeacherControls from "../../components/TeacherControls/TeacherControls";
import AnnotationToolbar from "../../components/AnnotationToolbar/AnnotationToolbar";
import ConnectionStatus from "../../components/ConnectionStatus/ConnectionStatus";
import "./TeacherDashboard.scss";

interface TeacherDashboardProps {
	onBack: () => void;
}

type SetupStep = "config" | "source" | "streaming";

function TeacherDashboard({ onBack }: TeacherDashboardProps) {
	const { isConnected, setConnected, setConnecting, students, setError, error } = useConnection();
	const { clearAllReactions } = useReactions();

	const [step, setStep] = useState<SetupStep>("config");
	const [teacherName, setTeacherName] = useState("");
	const [roomName, setRoomName] = useState("");
	const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
	const [screenMode, setScreenMode] = useState<ScreenMode>("live");
	const [localIPs, setLocalIPs] = useState<string[]>([]);

	// Get local IPs for display
	useEffect(() => {
		window.electronAPI.getLocalIPs().then(setLocalIPs);
	}, []);

	const handleStartSession = useCallback(async () => {
		if (!teacherName.trim() || !roomName.trim()) {
			setError("Wypelnij wszystkie pola");
			return;
		}

		setConnecting(true);
		setError(null);

		try {
			const result = await window.electronAPI.startTeacherSession({
				teacherName: teacherName.trim(),
				roomName: roomName.trim(),
				port: DEFAULT_PORT
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
	}, [teacherName, roomName, setConnecting, setError]);

	const handleSourceSelected = useCallback(
		async (sourceId: string) => {
			setSelectedSourceId(sourceId);

			try {
				const result = await window.electronAPI.startCapture(sourceId);
				if (result.success) {
					setConnected(true);
					setStep("streaming");
				} else {
					setError(result.error || "Nie udalo sie uruchomic przechwytywania ekranu");
				}
			} catch (err) {
				setError("Blad podczas uruchamiania przechwytywania");
			}
		},
		[setConnected, setError]
	);

	const handleStopSession = useCallback(async () => {
		try {
			await window.electronAPI.stopCapture();
			await window.electronAPI.stopTeacherSession();
			setConnected(false);
			clearAllReactions();
			onBack();
		} catch (err) {
			console.error("Error stopping session:", err);
		}
	}, [setConnected, clearAllReactions, onBack]);

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
					<button className="teacher-dashboard__back" onClick={onBack}>
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
								<div className="teacher-dashboard__info">
									<span className="teacher-dashboard__info-label">Adres IP:</span>
									<span className="teacher-dashboard__info-value">{localIPs.join(", ")}</span>
								</div>
							)}

							{error && <div className="teacher-dashboard__error">{error}</div>}

							<button
								className="teacher-dashboard__submit"
								onClick={handleStartSession}
								disabled={!teacherName.trim() || !roomName.trim()}
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
						) : (
							<div className="teacher-dashboard__preview-placeholder">
								<p>Ekran jest udostepniany uczniom</p>
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
