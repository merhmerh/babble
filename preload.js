const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ipc', {
    send: (channel, data) => ipcRenderer.invoke(channel, data),
    handle: (channel, callable, event, data) => ipcRenderer.on(channel, callable(event, data)),
    receive: (channel, listener) => {
        ipcRenderer.on(channel, (event, ...args) => listener(...args));
    },
    once: (channel, listener) => {
        ipcRenderer.once(channel, (event, ...args) => listener(...args));
    },
    promise: async (eventName, data) => {
        return await ipcRenderer.invoke(eventName, data)
    },
})
