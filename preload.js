const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('serialAPI', {
    onPorts: (callback) => {
        const listener = (_event, ports) => callback(ports);
        ipcRenderer.on('serial-ports', listener);
        return () => ipcRenderer.removeListener('serial-ports', listener);
    },
    onData: (callback) => {
        const listener = (_event, data) => callback(data);
        ipcRenderer.on('serial-data', listener);
        return () => ipcRenderer.removeListener('serial-data', listener);
    },
    onStatus: (callback) => {
        const listener = (_event, status) => callback(status);
        ipcRenderer.on('serial-status', listener);
        return () => ipcRenderer.removeListener('serial-status', listener);
    },
    loadModuleNames: () => ipcRenderer.invoke('read-module-names'),
    connect: (portPath) => ipcRenderer.invoke('serial-connect', portPath),
    disconnect: () => ipcRenderer.invoke('serial-disconnect'),
    send: (message) => ipcRenderer.invoke('serial-send', message)
});
