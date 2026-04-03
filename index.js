const path = require('path');
const fs = require('fs/promises');
const { app, BrowserWindow, ipcMain } = require('electron');
const serial = require('./serial');
const { parseSerialCommand } = require('./serial-protocol');

let mainWindow;

function formatPortLabel(port) {
    const portPath = String(port?.path || '');
    const windowsMatch = portPath.match(/^COM(\d+)$/i);
    if (windowsMatch) {
        return `COM ${windowsMatch[1]}`;
    }

    const segments = portPath.split(/[\\/]/).filter(Boolean);
    return segments[segments.length - 1] || portPath;
}

function createWindow() {
    const rendererEntry = path.join(__dirname, 'web', 'dist', 'index.html');
    const windowIcon = path.join(__dirname, 'build', 'icons', 'window-icon.png');

    mainWindow = new BrowserWindow({
        width: 1416,
        height: 818,
        autoHideMenuBar: true,
        icon: windowIcon,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(rendererEntry);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startSerialScan() {
    serial.stopScan();
    serial.scan((ports) => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return;
        }

        const formatted = ports.map((port) => ({
            path: port.path,
            label: formatPortLabel(port)
        }));

        mainWindow.webContents.send('serial-ports', formatted);
    });
}

function forwardParsedSerialData(message) {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return;
    }

    if (typeof message !== 'string') {
        return;
    }

    const parsed = parseSerialCommand(message);
    if (!parsed) {
        return;
    }

    mainWindow.webContents.send('serial-data', parsed);
}

app.whenReady().then(() => {
    createWindow();
    startSerialScan();

    ipcMain.handle('serial-connect', async (_event, portPath) => {
        if (!portPath) {
            throw new Error('No serial port path provided');
        }

        await serial.connect(portPath);
        serial.on('log', forwardParsedSerialData);
        serial.on('module', forwardParsedSerialData);
        serial.on('status', forwardParsedSerialData);
        serial.on('balancing', forwardParsedSerialData);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('serial-status', { connected: true, path: portPath });
        }

        return { connected: true };
    });

    ipcMain.handle('serial-disconnect', async () => {
        serial.disconnect();
        startSerialScan();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('serial-status', { connected: false });
        }
        return { connected: false };
    });

    ipcMain.handle('serial-send', async (_event, message) => {
        if (typeof message !== 'string' || !message.trim()) {
            throw new Error('No serial message provided');
        }

        const sent = serial.send(message.trim());
        if (!sent) {
            throw new Error('Failed to send serial message');
        }

        return { sent: true };
    });

    ipcMain.handle('read-module-names', async () => {
        const filePath = path.join(__dirname, 'modules.json');

        try {
            const content = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(content);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                return {};
            }

            throw error;
        }
    });

    serial.onClose(() => {
        startSerialScan();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('serial-status', { connected: false });
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
            startSerialScan();
        }
    });
});

app.on('window-all-closed', () => {
    serial.stopScan();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
