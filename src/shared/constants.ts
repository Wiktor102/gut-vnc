// Application constants

export const APP_NAME = "GUT VNC";
export const APP_VERSION = "1.0.0";

// Network
export const MDNS_SERVICE_TYPE = "gut-vnc";
export const MDNS_SERVICE_NAME = "_gut-vnc._tcp.local";
export const DEFAULT_PORT = 9876;
export const SIGNALING_PORT = 9877;

// WebRTC Configuration optimized for LAN
export const RTC_CONFIG: RTCConfiguration = {
	iceServers: [], // No STUN/TURN needed for LAN
	iceCandidatePoolSize: 0,
	bundlePolicy: "max-bundle",
	rtcpMuxPolicy: "require"
};

// Screen capture settings
export const CAPTURE_CONFIG = {
	minFrameRate: 5,
	maxFrameRate: 30,
	defaultFrameRate: 15,
	minBitrate: 500_000, // 500 Kbps
	maxBitrate: 8_000_000, // 8 Mbps
	defaultBitrate: 2_000_000 // 2 Mbps
};

// Reaction auto-clear timeout (ms)
export const REACTION_TIMEOUT = 30_000; // 30 seconds

// Reconnection settings
export const RECONNECT_INTERVAL = 3000; // 3 seconds
export const MAX_RECONNECT_ATTEMPTS = 10;

// Annotation defaults
export const ANNOTATION_COLORS = [
	"#ef4444", // Red
	"#f59e0b", // Orange
	"#22c55e", // Green
	"#3b82f6", // Blue
	"#8b5cf6", // Purple
	"#ec4899", // Pink
	"#ffffff", // White
	"#000000" // Black
];

export const DEFAULT_STROKE_WIDTH = 3;
export const POINTER_SIZE = 20;

// Polish translations
export const PL = {
	// General
	appName: "GUT VNC",
	loading: "Ladowanie...",
	connecting: "Laczenie...",
	connected: "Polaczono",
	disconnected: "Rozlaczono",
	error: "Blad",
	close: "Zamknij",
	cancel: "Anuluj",
	confirm: "Potwierdz",
	save: "Zapisz",

	// Role selection
	selectRole: "Wybierz role",
	teacher: "Nauczyciel",
	student: "Uczen",
	teacherDesc: "Udostepnij swoj ekran uczniom",
	studentDesc: "Dolacz do lekcji i ogladaj ekran nauczyciela",

	// Teacher
	startSession: "Rozpocznij sesje",
	stopSession: "Zakoncz sesje",
	roomName: "Nazwa sali",
	yourName: "Twoje imie",
	enterRoomName: "Wpisz nazwe sali...",
	enterYourName: "Wpisz swoje imie...",
	studentsConnected: "Polaczeni uczniowie",
	noStudents: "Brak polaczonych uczniow",
	waitingForStudents: "Oczekiwanie na uczniow...",
	clearReactions: "Wyczysc reakcje",
	kickStudent: "Usun ucznia",
	kickConfirm: "Czy na pewno chcesz usunac tego ucznia?",

	// Student
	joinSession: "Dolacz do sesji",
	leaveSession: "Opusc sesje",
	searchingTeacher: "Szukanie nauczyciela...",
	selectTeacher: "Wybierz nauczyciela",
	noTeachersFound: "Nie znaleziono nauczycieli",
	refreshList: "Odswiez liste",
	enterName: "Wpisz swoje imie",

	// Reactions
	reactions: "Reakcje",
	raiseHand: "Podnies reke",
	thumbsUp: "Kciuk w gore",
	question: "Pytanie",
	confused: "Nie rozumiem",
	clearMyReaction: "Wyczysc moja reakcje",

	// Screen controls
	screenControls: "Sterowanie ekranem",
	pauseScreen: "Wstrzymaj ekran",
	resumeScreen: "Wznow ekran",
	blankScreen: "Ukryj ekran",
	showScreen: "Pokaz ekran",
	screenPaused: "Ekran wstrzymany",
	screenBlank: "Ekran ukryty",
	breakMessage: "Przerwa",

	// Annotations
	annotations: "Adnotacje",
	pointer: "Wskaznik",
	pen: "Pisak",
	arrow: "Strzalka",
	rectangle: "Prostokat",
	text: "Tekst",
	eraser: "Gumka",
	clearAnnotations: "Wyczysc adnotacje",

	// Connection status
	connectionStatus: "Status polaczenia",
	connectionGood: "Polaczenie dobre",
	connectionPoor: "Slabe polaczenie",
	connectionLost: "Utracono polaczenie",
	reconnecting: "Ponowne laczenie...",

	// Errors
	connectionError: "Blad polaczenia",
	sessionEnded: "Sesja zostala zakonczona",
	kicked: "Zostales usuniety z sesji",
	networkError: "Blad sieci",

	// Quality
	quality: "Jakosc",
	qualityAuto: "Automatyczna",
	qualityHigh: "Wysoka",
	qualityMedium: "Srednia",
	qualityLow: "Niska"
} as const;

export type TranslationKey = keyof typeof PL;
