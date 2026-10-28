//=====================================================
// File: startAll.js (Done by Yu Kang)
// Description: This script starts both the backend server and the kiosk server concurrently.
// Usage: Run this script using Node.js to start both servers.
// Note: Ensure that you have the necessary permissions to run child processes and that the required scripts exist in the specified paths.
//=====================================================

const { spawn } = require('child_process');
const path = require('path');

const scripts = ['backend/server.js', 'backend/kioskServer.js'];
const children = [];

function startScript(scriptName) {
	const child = spawn(process.execPath, [path.join(__dirname, scriptName)], {
		cwd: __dirname,
		stdio: 'inherit',
		env: process.env,
	});

	child.on('exit', (code, signal) => {
		console.log(`Process ended: ${scriptName} ${signal ? `(${signal})` : `(code ${code})`}`);

		for (const otherChild of children) {
			if (otherChild !== child && !otherChild.killed) {
				otherChild.kill();
			}
		}

		if (!process.exitCode) {
			process.exitCode = code ?? 1;
		}
	});

	child.on('error', (error) => {
		console.error(`Failed to start ${scriptName}:`, error.message);
		process.exitCode = 1;
	});

	children.push(child);
}

for (const scriptName of scripts) {
	startScript(scriptName);
}

function shutdown() {
	for (const child of children) {
		if (!child.killed) {
			child.kill();
		}
	}
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
