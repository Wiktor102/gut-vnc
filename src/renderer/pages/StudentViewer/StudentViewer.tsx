import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useConnection } from "../../context/ConnectionContext";
import { useReactions } from "../../context/ReactionsContext";
import { PL } from "@shared/constants";
import { ReactionType, ScreenMode } from "@shared/types";
import ReactionBar from "../../components/ReactionBar/ReactionBar";
import ReactionDisplay from "../../components/ReactionDisplay/ReactionDisplay";
import ConnectionStatus from "../../components/ConnectionStatus/ConnectionStatus";
import "./StudentViewer.scss";

interface TeacherInfo {
	name: string;
	roomName: string;
	address: string;
	port: number;
}

type ViewerStep = "name" | "discover" | "viewing";

function StudentViewer() {
	const navigate = useNavigate();
	const { setConnected, setConnecting, setError, error, reset } = useConnection();
	const { myReaction, setMyReaction, setReaction, clearAllReactions } = useReactions();

	const [step, setStep] = useState<ViewerStep | "connecting">("name");
	const [studentName, setStudentName] = useState("");
	const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
	const [selectedTeacher, setSelectedTeacher] = useState<TeacherInfo | null>(null);
	const [isSearching, setIsSearching] = useState(false);
	const [screenMode, setScreenMode] = useState<ScreenMode>("live");
	const [blankMessage, setBlankMessage] = useState("");

	const wsRef = useRef<WebSocket | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const connectTimeoutRef = useRef<number | null>(null);
	const stepRef = useRef(step);
	const studentIdRef = useRef<string | null>(null);
	const intentionalDisconnectRef = useRef(false);
	const handleMessageRef = useRef<(message: Record<string, unknown>) => void>(() => undefined);

	useEffect(() => {
		stepRef.current = step;
	}, [step]);

	const getStudentId = useCallback((): string => {
		if (!studentIdRef.current) {
			studentIdRef.current =
				typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
					? crypto.randomUUID()
					: `${Date.now()}-${Math.random().toString(16).slice(2)}`;
		}
		return studentIdRef.current;
	}, []);

	const clearConnectTimeout = useCallback(() => {
		if (connectTimeoutRef.current) {
			window.clearTimeout(connectTimeoutRef.current);
			connectTimeoutRef.current = null;
		}
	}, []);

	const cleanupTransport = useCallback(() => {
		clearConnectTimeout();

		const ws = wsRef.current;
		wsRef.current = null;
		if (ws) {
			ws.onopen = null;
			ws.onmessage = null;
			ws.onclose = null;
			ws.onerror = null;
			try {
				if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
					ws.close();
				}
			} catch {
				// ignore
			}
		}

		if (peerConnectionRef.current) {
			try {
				peerConnectionRef.current.ontrack = null;
				peerConnectionRef.current.onicecandidate = null;
				peerConnectionRef.current.close();
			} catch {
				// ignore
			}
			peerConnectionRef.current = null;
		}
	}, [clearConnectTimeout]);

	const disconnect = useCallback(() => {
		intentionalDisconnectRef.current = true;
		cleanupTransport();
		setConnected(false);
		clearAllReactions();
		setMyReaction(null);
	}, [cleanupTransport, setConnected, clearAllReactions, setMyReaction]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			disconnect();
		};
	}, [disconnect]);

	const handleDiscover = useCallback(async () => {
		setIsSearching(true);
		setError(null);

		try {
			const result = await window.electronAPI.discoverTeachers();
			if (result.success) {
				setTeachers(result.teachers);
				if (result.teachers.length === 0) {
					// Keep searching
					window.setTimeout(() => {
						void handleDiscover();
					}, 3000);
				}
			} else {
				setError(result.error || "Blad podczas wyszukiwania");
			}
		} catch (err) {
			setError("Blad podczas wyszukiwania nauczycieli");
		} finally {
			setIsSearching(false);
		}
	}, [setError]);

	const handleNameSubmit = useCallback(() => {
		if (!studentName.trim()) {
			setError("Wpisz swoje imie");
			return;
		}
		setStep("discover");
		handleDiscover();
	}, [studentName, setError, handleDiscover]);

	const handleConnect = useCallback(
		async (teacher: TeacherInfo) => {
			setSelectedTeacher(teacher);
			setStep("connecting");
			setConnecting(true);
			setError(null);
			intentionalDisconnectRef.current = false;
			cleanupTransport();

			try {
				const host = teacher.address.includes(":") && !teacher.address.startsWith("[") ? `[${teacher.address}]` : teacher.address;

				// Connect via WebSocket
				const ws = new WebSocket(`ws://${host}:${teacher.port}`);
				wsRef.current = ws;

				// If the socket opens but we never get a welcome, show an error.
				connectTimeoutRef.current = window.setTimeout(() => {
					if (stepRef.current === "connecting") {
						setError("Brak odpowiedzi od nauczyciela");
						setStep("discover");
						cleanupTransport();
						setConnected(false);
					}
				}, 8000);

				ws.onopen = () => {
					// Send join message
					const studentId = getStudentId();
					ws.send(
						JSON.stringify({
							type: "join",
							studentId,
							studentName: studentName.trim(),
							timestamp: Date.now()
						})
					);
				};

				ws.onmessage = event => {
					try {
						const message = JSON.parse(event.data);
						handleMessageRef.current(message);
					} catch (err) {
						console.error("Failed to parse message:", err);
					}
				};

				ws.onclose = () => {
					setConnected(false);
					clearConnectTimeout();
					if (!intentionalDisconnectRef.current) {
						if (stepRef.current === "connecting") {
							setError("Nie udalo sie polaczyc");
						}
						if (stepRef.current === "viewing") {
							setError("Polaczenie zostalo zamkniete");
						}
						if (stepRef.current !== "name") {
							setStep("discover");
						}
					}
				};

				ws.onerror = () => {
					setError("Blad polaczenia");
					setConnected(false);
					clearConnectTimeout();
					setStep("discover");
					cleanupTransport();
				};
			} catch (err) {
				setError("Nie udalo sie polaczyc");
				setConnected(false);
				clearConnectTimeout();
				setStep("discover");
			}
		},
		[cleanupTransport, clearConnectTimeout, getStudentId, studentName, setConnecting, setConnected, setError]
	);

	async function handleOffer(message: Record<string, unknown>) {
		try {
			const pc = new RTCPeerConnection({
				iceServers: []
			});
			peerConnectionRef.current = pc;

			pc.ontrack = event => {
				if (videoRef.current && event.streams[0]) {
					videoRef.current.srcObject = event.streams[0];
				}
			};

			pc.onicecandidate = event => {
				if (event.candidate && wsRef.current) {
					wsRef.current.send(
						JSON.stringify({
							type: "ice-candidate",
							candidate: event.candidate.toJSON(),
							timestamp: Date.now()
						})
					);
				}
			};

			await pc.setRemoteDescription(message.sdp as RTCSessionDescriptionInit);
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);

			if (wsRef.current) {
				wsRef.current.send(
					JSON.stringify({
						type: "answer",
						sdp: answer,
						timestamp: Date.now()
					})
				);
			}
		} catch (err) {
			console.error("Failed to handle offer:", err);
		}
	}

	async function handleIceCandidate(message: Record<string, unknown>) {
		try {
			if (peerConnectionRef.current && message.candidate) {
				await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate as RTCIceCandidateInit));
			}
		} catch (err) {
			console.error("Failed to add ICE candidate:", err);
		}
	}

	const handleMessage = useCallback(
		(message: Record<string, unknown>) => {
			switch (message.type) {
				case "welcome":
					clearConnectTimeout();
					setConnected(true);
					setStep("viewing");
					break;

				case "reaction-update":
					setReaction(message.studentId as string, message.studentId as string, message.reaction as ReactionType);
					break;

				case "all-reactions": {
					// Handle all reactions
					const reactions = message.reactions as Record<string, { name: string; reaction: ReactionType }>;
					Object.entries(reactions).forEach(([id, data]) => {
						setReaction(id, data.name, data.reaction);
					});
					break;
				}

				case "clear-reactions":
					clearAllReactions();
					setMyReaction(null);
					break;

				case "screen-mode":
					setScreenMode(message.mode as ScreenMode);
					if (message.message) {
						setBlankMessage(message.message as string);
					}
					break;

				case "kicked":
					disconnect();
					setError((message.reason as string) || PL.kicked);
					setStep("discover");
					break;

				case "offer":
					void handleOffer(message);
					break;

				case "ice-candidate":
					void handleIceCandidate(message);
					break;
			}
		},
		[clearConnectTimeout, setConnected, setReaction, clearAllReactions, setMyReaction, setError, disconnect]
	);

	useEffect(() => {
		handleMessageRef.current = handleMessage;
	}, [handleMessage]);

	const handleReaction = useCallback(
		(reaction: ReactionType) => {
			const newReaction = myReaction === reaction ? null : reaction;
			setMyReaction(newReaction);

			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				const studentId = getStudentId();
				wsRef.current.send(
					JSON.stringify({
						type: "reaction",
						studentId,
						reaction: newReaction,
						timestamp: Date.now()
					})
				);
			}
		},
		[getStudentId, myReaction, setMyReaction]
	);

	const handleDisconnect = useCallback(() => {
		disconnect();
		reset();
		navigate("/");
	}, [disconnect, reset, navigate]);

	// Name input step
	if (step === "name") {
		return (
			<div className="student-viewer">
				<div className="student-viewer__setup">
					<button className="student-viewer__back" onClick={() => navigate("/")}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M19 12H5M12 19l-7-7 7-7" />
						</svg>
						{PL.cancel}
					</button>

					<div className="student-viewer__setup-card">
						<h1 className="student-viewer__title">{PL.joinSession}</h1>

						<div className="student-viewer__form">
							<div className="student-viewer__field">
								<label htmlFor="studentName">{PL.yourName}</label>
								<input
									id="studentName"
									type="text"
									value={studentName}
									onChange={e => setStudentName(e.target.value)}
									placeholder={PL.enterName}
									autoFocus
									onKeyDown={e => e.key === "Enter" && handleNameSubmit()}
								/>
							</div>

							{error && <div className="student-viewer__error">{error}</div>}

							<button className="student-viewer__submit" onClick={handleNameSubmit} disabled={!studentName.trim()}>
								Dalej
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Teacher discovery step
	if (step === "discover") {
		return (
			<div className="student-viewer">
				<div className="student-viewer__setup">
					<button className="student-viewer__back" onClick={() => setStep("name")}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M19 12H5M12 19l-7-7 7-7" />
						</svg>
						Wstecz
					</button>

					<div className="student-viewer__setup-card">
						<h1 className="student-viewer__title">{PL.selectTeacher}</h1>

						{isSearching && teachers.length === 0 && (
							<div className="student-viewer__searching">
								<div className="student-viewer__spinner" />
								<p>{PL.searchingTeacher}</p>
							</div>
						)}

						{teachers.length > 0 && (
							<div className="student-viewer__teachers">
								{teachers.map((teacher, index) => (
									<button
										key={`${teacher.address}:${teacher.port}-${index}`}
										className="student-viewer__teacher"
										onClick={() => handleConnect(teacher)}
									>
										<div className="student-viewer__teacher-icon">
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
												<rect x="2" y="3" width="20" height="14" rx="2" />
												<line x1="8" y1="21" x2="16" y2="21" />
												<line x1="12" y1="17" x2="12" y2="21" />
											</svg>
										</div>
										<div className="student-viewer__teacher-info">
											<span className="student-viewer__teacher-name">{teacher.name}</span>
											<span className="student-viewer__teacher-room">{teacher.roomName}</span>
										</div>
										<svg
											className="student-viewer__teacher-arrow"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path d="M9 18l6-6-6-6" />
										</svg>
									</button>
								))}
							</div>
						)}

						{!isSearching && teachers.length === 0 && (
							<div className="student-viewer__no-teachers">
								<p>{PL.noTeachersFound}</p>
							</div>
						)}

						{error && <div className="student-viewer__error">{error}</div>}

						<button className="student-viewer__refresh" onClick={handleDiscover} disabled={isSearching}>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M23 4v6h-6M1 20v-6h6" />
								<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
							</svg>
							{PL.refreshList}
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Connecting step
	if (step === "connecting") {
		return (
			<div className="student-viewer">
				<div className="student-viewer__setup">
					<button
						className="student-viewer__back"
						onClick={() => {
							intentionalDisconnectRef.current = true;
							cleanupTransport();
							setConnected(false);
							setStep("discover");
						}}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M19 12H5M12 19l-7-7 7-7" />
						</svg>
						Wstecz
					</button>

					<div className="student-viewer__setup-card">
						<h1 className="student-viewer__title">{PL.connecting}</h1>

						<div className="student-viewer__searching">
							<div className="student-viewer__spinner" />
							<p>{selectedTeacher ? `${selectedTeacher.name} - ${selectedTeacher.roomName}` : PL.searchingTeacher}</p>
						</div>

						{error && <div className="student-viewer__error">{error}</div>}
					</div>
				</div>
			</div>
		);
	}

	// Viewing step
	return (
		<div className="student-viewer student-viewer--viewing">
			<header className="student-viewer__header">
				<div className="student-viewer__header-left">
					<h1 className="student-viewer__room-name">{selectedTeacher?.roomName || "Sesja"}</h1>
					<span className="student-viewer__teacher-name-display">{selectedTeacher?.name}</span>
					<ConnectionStatus />
				</div>
				<div className="student-viewer__header-right">
					<button className="student-viewer__leave-btn" onClick={handleDisconnect}>
						{PL.leaveSession}
					</button>
				</div>
			</header>

			<div className="student-viewer__main">
				<div className="student-viewer__screen">
					{screenMode === "blank" ? (
						<div className="student-viewer__blank">
							<span>{blankMessage || PL.breakMessage}</span>
						</div>
					) : screenMode === "paused" ? (
						<div className="student-viewer__paused">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<circle cx="12" cy="12" r="10" />
								<line x1="10" y1="8" x2="10" y2="16" strokeWidth="3" />
								<line x1="14" y1="8" x2="14" y2="16" strokeWidth="3" />
							</svg>
							<span>{PL.screenPaused}</span>
						</div>
					) : (
						<video ref={videoRef} className="student-viewer__video" autoPlay playsInline />
					)}
				</div>

				<div className="student-viewer__reactions-panel">
					<ReactionDisplay />
				</div>
			</div>

			<ReactionBar currentReaction={myReaction} onReaction={handleReaction} />
		</div>
	);
}

export default StudentViewer;
