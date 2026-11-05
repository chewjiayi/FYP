// systemRoutes.js
// System Status page APIs (hardware metrics + AI/LLM health)
// Mounted in server.js at: /api/admin/system
//   GET /api/admin/system/metrics    -> CPU / memory / GPU / storage
//   GET /api/admin/system/ai-health  -> Ollama running? which models installed / loaded?
// BY ZHI RUO

const express = require('express');
const path = require('path');
const si = require('systeminformation');
const auth = require('./auth');

const router = express.Router();

// Same login check server.js uses for protected pages
router.use(auth.requireAuth);

// ==================== Hardware metrics ====================
router.get('/metrics', async (req, res) => {
    try {
        const [load, mem, graphics, fsSize] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.graphics(),
            si.fsSize()
        ]);

        // GPU: utilization is null when the driver doesn't report it (common on non-NVIDIA)
        const gpus = (graphics.controllers || []).map(g => ({
            name: g.model,
            utilization: g.utilizationGpu ?? null,          // %
            memoryUsedMB: g.memoryUsed ?? null,
            memoryTotalMB: g.memoryTotal ?? g.vram ?? null,
            temperature: g.temperatureGpu ?? null            // °C
        }));

        // Storage: the drive / mount that holds the application folder
        const appPath = path.resolve(process.cwd()).toLowerCase();
        const drive = fsSize
            .filter(d => appPath.startsWith(String(d.mount).toLowerCase()))
            .sort((a, b) => b.mount.length - a.mount.length)[0] || fsSize[0];

        const usedMemBytes = mem.total - mem.available;

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            cpu: {
                usage: Math.round(load.currentLoad * 10) / 10,      // %
                cores: load.cpus.length
            },
            memory: {
                usedMB: Math.round(usedMemBytes / 1048576),
                totalMB: Math.round(mem.total / 1048576),
                usage: Math.round((usedMemBytes / mem.total) * 1000) / 10
            },
            gpus,
            storage: drive ? {
                mount: drive.mount,
                usedGB: Math.round(drive.used / 1073741824 * 10) / 10,
                totalGB: Math.round(drive.size / 1073741824 * 10) / 10,
                usage: Math.round(drive.use * 10) / 10
            } : null,
            process: {
                rssMB: Math.round(process.memoryUsage().rss / 1048576)
            }
        });
    } catch (err) {
        console.error('System metrics error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== AI / LLM health (Ollama) ====================
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EXPECTED_MODELS = ['phi3', 'gemma2:2b', 'qwen2.5:3b'];

router.get('/ai-health', async (req, res) => {
    // Ollama lists "phi3" as "phi3:latest", so accept both forms
    const matches = (installedName, wanted) =>
        installedName === wanted || installedName === `${wanted}:latest`;

    try {
        const [tagsRes, psRes] = await Promise.all([
            fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) }), // installed
            fetch(`${OLLAMA_URL}/api/ps`,   { signal: AbortSignal.timeout(3000) })  // loaded in memory
        ]);
        const tags = await tagsRes.json();
        const ps = await psRes.json();

        const installed = (tags.models || []).map(m => m.name);
        const loaded = (ps.models || []).map(m => m.name);

        res.json({
            success: true,
            ollama: { running: true, url: OLLAMA_URL },
            models: EXPECTED_MODELS.map(wanted => ({
                name: wanted,
                installed: installed.some(n => matches(n, wanted)),
                loaded: loaded.some(n => matches(n, wanted))
            }))
        });
    } catch (err) {
        // Ollama stopped / unreachable: still answer, so the UI can show "Offline"
        res.json({
            success: true,
            ollama: { running: false, url: OLLAMA_URL, error: err.message },
            models: EXPECTED_MODELS.map(name => ({ name, installed: false, loaded: false }))
        });
    }
});

module.exports = router;
