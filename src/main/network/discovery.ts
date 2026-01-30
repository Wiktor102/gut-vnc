import Bonjour, { Service, Browser } from "bonjour-service";
import { EventEmitter } from "events";
import { isIP } from "net";
import { MDNS_SERVICE_TYPE, DEFAULT_PORT } from "@shared/constants";

function isLoopbackV4(address: string): boolean {
	return address.startsWith("127.");
}

function isLinkLocalV4(address: string): boolean {
	return address.startsWith("169.254.");
}

function isPrivateV4(address: string): boolean {
	if (address.startsWith("10.")) return true;
	if (address.startsWith("192.168.")) return true;
	if (address.startsWith("172.")) {
		const second = Number(address.split(".")[1]);
		return second >= 16 && second <= 31;
	}
	return false;
}

function scoreIpAddress(address: string): number {
	const ipVersion = isIP(address);
	if (ipVersion === 4) {
		if (isLoopbackV4(address)) return -1000;
		if (isLinkLocalV4(address)) return -500;
		if (address.startsWith("192.168.")) return 300;
		if (address.startsWith("10.")) return 200;
		if (isPrivateV4(address)) return 190;
		return 100;
	}

	if (ipVersion === 6) {
		const lower = address.toLowerCase();
		if (lower === "::1") return -1000;
		if (lower.startsWith("fe80:")) return -500;
		// Prefer global over ULA (fc00::/7) a little bit.
		if (lower.startsWith("fc") || lower.startsWith("fd")) return 80;
		return 120;
	}

	return -2000;
}

export interface DiscoveredTeacher {
	name: string;
	roomName: string;
	address: string;
	port: number;
}

export class DiscoveryService extends EventEmitter {
	private bonjour: Bonjour;
	private publishedService: Service | null = null;
	private browser: Browser | null = null;
	private discoveredTeachers: Map<string, DiscoveredTeacher> = new Map();

	constructor() {
		super();
		this.bonjour = new Bonjour();
	}

	/**
	 * Advertise as a teacher on the network
	 */
	async advertise(roomName: string, teacherName: string, port: number = DEFAULT_PORT, host?: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.publishedService = this.bonjour.publish({
					name: `${roomName}-${Date.now()}`,
					type: MDNS_SERVICE_TYPE,
					port: port,
					host: host, // Specify which interface to advertise on
					txt: {
						room: roomName,
						teacher: teacherName,
						version: "1.0"
					}
				});

				this.publishedService.on("up", () => {
					console.info(`mDNS service published: ${roomName} on port ${port}`);
					resolve();
				});

				this.publishedService.on("error", error => {
					console.error("mDNS publish error:", error);
					reject(error);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Stop advertising
	 */
	stopAdvertising(): void {
		if (this.publishedService) {
			this.publishedService.stop?.(() => {
				console.info("mDNS service stopped");
			});
			this.publishedService = null;
		}
	}

	/**
	 * Discover teachers on the network
	 */
	async discover(timeout: number = 5000): Promise<DiscoveredTeacher[]> {
		return new Promise(resolve => {
			this.discoveredTeachers.clear();

			this.browser = this.bonjour.find({ type: MDNS_SERVICE_TYPE }, service => {
				this.handleServiceFound(service);
			});

			// Resolve after timeout
			setTimeout(() => {
				resolve(Array.from(this.discoveredTeachers.values()));
			}, timeout);
		});
	}

	/**
	 * Start continuous discovery
	 */
	startContinuousDiscovery(): void {
		if (this.browser) {
			this.stopDiscovery();
		}

		this.discoveredTeachers.clear();

		this.browser = this.bonjour.find({ type: MDNS_SERVICE_TYPE }, service => {
			this.handleServiceFound(service);
		});
	}

	/**
	 * Stop discovery
	 */
	stopDiscovery(): void {
		if (this.browser) {
			this.browser.stop();
			this.browser = null;
		}
		this.discoveredTeachers.clear();
	}

	/**
	 * Get currently discovered teachers
	 */
	getDiscoveredTeachers(): DiscoveredTeacher[] {
		return Array.from(this.discoveredTeachers.values());
	}

	private handleServiceFound(service: Service): void {
		// Skip own service
		if (this.publishedService && service.name === this.publishedService.name) {
			return;
		}

		const txt = service.txt as Record<string, string> | undefined;
		if (!txt) return;

		const teacher: DiscoveredTeacher = {
			name: txt.teacher || "Unknown",
			roomName: txt.room || "Unknown Room",
			address: this.pickBestAddress(service),
			port: service.port || DEFAULT_PORT
		};

		const key = `${teacher.address}:${teacher.port}`;

		if (!this.discoveredTeachers.has(key)) {
			this.discoveredTeachers.set(key, teacher);
			this.emit("teacher-found", teacher);
			console.info(`Discovered teacher: ${teacher.name} at ${teacher.address}:${teacher.port}`);
		}
	}

	private pickBestAddress(service: Service): string {
		const candidates: string[] = [];

		// `referer.address` is often the most accurate “where the response came from”.
		const refererAddress = (service as unknown as { referer?: { address?: string } })?.referer?.address;
		if (refererAddress) candidates.push(refererAddress);

		candidates.push(...((service.addresses || []).filter(Boolean) as string[]));

		const ranked = candidates
			.filter(a => isIP(a) !== 0)
			.map(a => ({ address: a, score: scoreIpAddress(a) }))
			.sort((a, b) => b.score - a.score);

		if (ranked.length > 0 && ranked[0].score > -1000) {
			return ranked[0].address;
		}

		return service.host || "localhost";
	}

	/**
	 * Cleanup
	 */
	destroy(): void {
		this.stopAdvertising();
		this.stopDiscovery();
		this.bonjour.destroy();
	}
}
