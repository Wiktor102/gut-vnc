import { spawn } from "child_process";

export interface FirewallEnsureResult {
	success: boolean;
	attempted: boolean;
	message?: string;
}

function psEscapeSingleQuoted(value: string): string {
	return value.replace(/'/g, "''");
}

function runPowerShell(command: string): Promise<{ code: number; stdout: string; stderr: string }> {
	return new Promise(resolve => {
		const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
			windowsHide: true
		});

		let stdout = "";
		let stderr = "";

		ps.stdout.on("data", chunk => {
			stdout += chunk.toString();
		});
		ps.stderr.on("data", chunk => {
			stderr += chunk.toString();
		});

		ps.on("close", code => {
			resolve({ code: code ?? 0, stdout, stderr });
		});
	});
}

async function isRunningAsAdmin(): Promise<boolean> {
	const check =
		"([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)";
	const result = await runPowerShell(check);
	return result.code === 0 && result.stdout.toString().trim().toLowerCase() === "true";
}

/**
 * Ensures Windows Firewall allows inbound connections to this app.
 *
 * Note: Creating firewall rules requires elevation (UAC prompt) unless the app is already running as admin.
 */
export async function ensureWindowsFirewallException(ruleName: string): Promise<FirewallEnsureResult> {
	if (process.platform !== "win32") {
		return { success: true, attempted: false };
	}

	const exePath = process.execPath;
	const escapedRuleName = psEscapeSingleQuoted(ruleName);
	const escapedExePath = psEscapeSingleQuoted(exePath);

	// We scope the rule by program path (more precise than opening ports).
	const ensureScript = `
$ErrorActionPreference = 'Stop'
$ruleName = '${escapedRuleName}'
$exe = '${escapedExePath}'

# If a rule with the same name exists, keep it unless it points to a different program.
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($null -eq $existing) {
	New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Program $exe -Profile Private | Out-Null
	exit 0
}

# If it exists, make sure the program matches; otherwise replace it.
$filters = $existing | Get-NetFirewallApplicationFilter -ErrorAction SilentlyContinue
$programs = @($filters | Select-Object -ExpandProperty Program -ErrorAction SilentlyContinue)
if ($programs -notcontains $exe) {
	$existing | Remove-NetFirewallRule -ErrorAction SilentlyContinue
	New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Program $exe -Profile Private | Out-Null
}

exit 0
`;

	try {
		const admin = await isRunningAsAdmin();

		if (admin) {
			const direct = await runPowerShell(`& { ${ensureScript} }`);
			if (direct.code === 0) return { success: true, attempted: true };
			return { success: false, attempted: true, message: direct.stderr || direct.stdout };
		}

		// Relaunch a one-off elevated PowerShell to create the rule.
		const elevatedCommand = `
$inner = @'
${ensureScript}
'@
$p = Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command', $inner) -Wait -PassThru
exit $p.ExitCode
`;

		const elevated = await runPowerShell(elevatedCommand);
		if (elevated.code === 0) return { success: true, attempted: true };

		const combined = `${elevated.stderr}\n${elevated.stdout}`.trim();
		return {
			success: false,
			attempted: true,
			message: combined || "Failed to create Windows Firewall rule (possibly canceled UAC prompt)."
		};
	} catch (error) {
		return { success: false, attempted: true, message: String(error) };
	}
}
