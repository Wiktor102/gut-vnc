import { app, BrowserWindow, ipcMain, desktopCapturer, screen } from "electron";
import * as path from "path";
import { setupIpcHandlers } from "./ipc/handlers";

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === "development";

function createWindow(): void {
	const primaryDisplay = screen.getPrimaryDisplay();
	const { width, height } = primaryDisplay.workAreaSize;

	mainWindow = new BrowserWindow({
		width: Math.min(1400, width),
		height: Math.min(900, height),
		minWidth: 800,
		minHeight: 600,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "../preload/index.js")
		},
		backgroundColor: "#0f172a",
		show: false,
		titleBarStyle: "default",
		title: "GUT VNC"
	});

	// Load the app
	if (isDev) {
		mainWindow.loadURL("http://localhost:3000");
		mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
	}

	// Show window when ready
	mainWindow.once("ready-to-show", () => {
		mainWindow?.show();
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

// App lifecycle
app.whenReady().then(() => {
	createWindow();
	setupIpcHandlers();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
	app.quit();
} else {
	app.on("second-instance", () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) {
				mainWindow.restore();
			}
			mainWindow.focus();
		}
	});
}

// Export for IPC handlers
export function getMainWindow(): BrowserWindow | null {
	return mainWindow;
}
