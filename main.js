const { app, BrowserWindow, Menu, MenuItem, ipcMain, screen, Tray, shell, dialog, Notification } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const fs = require('fs')
const extName = require('ext-name');
require('dotenv').config()
const crypto = require('crypto');

const isDev = (() => {
    return process.env.NODE_ENV == 'dev' ? true : false
})()

console.log(`is dev env: ${isDev}`);

//create config file
const configPath = path.join(app.getPath("userData"), "config.json")
if (!fs.existsSync(configPath)) {
    const data = {}
    fs.writeFileSync(configPath, JSON.stringify(data))
}

//get config data
const configData = JSON.parse(fs.readFileSync(configPath))


const createWindow = () => {
    let displays = screen.getAllDisplays()

    let externalDisplay = displays.find((display) => {
        return display.bounds.x !== 0 || display.bounds.y !== 0
    })
    let x = 50, y = 250
    if (displays[1]) {
        x = externalDisplay.bounds.x + 50;
        y = externalDisplay.bounds.y + 250;
    }

    const window = new BrowserWindow({
        x: x,
        y: y,
        minWidth: 450,
        minHeight: 800,
        width: 900,
        height: 800,
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            spellcheck: true,
            nodeIntegration: true,
            preload: path.join(__dirname, "preload.js") // use a preload script
            // contextIsolation: true,
        }
    })

    if (isDev) {
        window.webContents.openDevTools();
    }

    const menu = Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                {
                    label: 'Quit',
                    accelerator: process.platform == 'win32' ? 'Alt+Q' : 'Command+Q',
                    click() {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Tools',
            submenu: [{
                label: 'DevTools',
                accelerator: 'F12',
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }]
        }
    ])

    Menu.setApplicationMenu(menu)

    // window.loadFile('page/index.html')
    window.loadURL(`file://${__dirname}/page/index.html`)

    window.webContents.on('context-menu', (event, params) => {

        if (params.isEditable && params.misspelledWord) {
            const menu = new Menu()

            // Add each spelling suggestion
            for (const suggestion of params.dictionarySuggestions) {
                menu.append(new MenuItem({
                    label: suggestion,
                    click: () => window.webContents.replaceMisspelling(suggestion)
                }))
            }

            return menu.popup()
        }

        if (isDev) {
            const menu = new Menu()
            const menuItem = new MenuItem({
                label: 'Inspect Element',
                click: () => {
                    window.webContents.inspectElement(params.x, params.y)
                }
            })
            menu.append(menuItem)
            menu.popup()
        }


    })

    window.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' };
    });


    ipcMain.handle('isFocus', (event, arg) => {
        return window.isFocused() ? true : false
    })

    ipcMain.handle('focusWindow', () => {
        window.focus()
        window.flashFrame(false)
    })

    ipcMain.handle('flashFrame', () => {
        window.flashFrame(true)
    })

    ipcMain.handle('minimize', () => {
        window.minimize()
    })

    ipcMain.handle('minimizeToTray', () => {
        console.log('to tray');
        window.hide()
    })

    ipcMain.handle('download', (event, url) => {
        window.webContents.downloadURL(url)
    })

    ipcMain.handle('getFile', () => {
        const filePath = dialog.showOpenDialogSync(window, {
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'webp', 'svg', 'png', 'gif'] }],
        })
        const fileName = filePath[0].split('\\').pop()

        const type = extName(fileName)
        const base64 = fs.readFileSync(filePath[0]).toString('base64')
        return `data:${type[0].mime};base64,${base64}`
    })


    ipcMain.handle('getConfig', () => {
        return JSON.parse(fs.readFileSync(configPath))
    })

    ipcMain.handle('replaceConfig', (event, newConfig) => {
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2))
    })

    ipcMain.handle('updateConfig', (event, obj) => {
        const newConfig = JSON.parse(fs.readFileSync(configPath))

        for (const item in obj['add']) {
            newConfig[item] = obj['add'][item]
        }

        for (const item in obj['remove']) {
            delete newConfig[obj['remove'][item]]
        }

        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2))
        return newConfig
    })

    ipcMain.handle('decrypt', (e, data) => {
        const secret = data.secret
        const string = data.hash
        const [iv, hash] = string.split(':').map(part => part, 'hex')
        const decipher = (() => {
            try {
                return crypto.createDecipheriv('aes-256-ctr', secret, Buffer.from(iv, 'hex'))
            } catch (err) {
                console.log('invalid passphrase');
                return false
            }
        })()

        if (!decipher) {
            return ''
        }

        const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash, 'hex')), decipher.final()])
        return decrpyted.toString()
    })

    ipcMain.handle('encrypt', (e, data) => {
        const secret = data.secret
        const string = data.password
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-ctr', secret, iv)
        const encrypted = Buffer.concat([cipher.update(string), cipher.final()])
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    })

    window.on('focus', () => {
        window.flashFrame(false)
        window.webContents.send('focus')
    })

    ipcMain.handle('checkUpdate', () => {
        const version = ''
        if (isDev) {
            return ([version, 'dev'])
        }
        return new Promise((resolve) => {
            autoUpdater.checkForUpdatesAndNotify()
            autoUpdater.on('update-available', () => {
                resolve([version, 'update available'])
            });

            autoUpdater.on('update-not-available', () => {
                resolve([version, 'latest'])
            })
        })
    })

    if (!isDev) {
        window.once('ready-to-show', () => {
            autoUpdater.checkForUpdatesAndNotify()
            autoUpdater.on('update-available', () => {
                window.webContents.send('haveUpdate', 'update available')
            });

            autoUpdater.on('update-not-available', () => {
                window.webContents.send('haveUpdate', 'latest')
            })
        })
    }

    return window
}


app.whenReady().then(() => {
    const window = createWindow()
    const tray = new Tray(path.join(__dirname, 'assets/icon.ico'))

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open', click() { window.show() } },
        { type: 'separator' },
        { label: 'Exit', role: 'close', click() { app.quit() } },
    ])


    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
        window.show();
    })

    app.setAppUserModelId('com.babble.app')

    ipcMain.handle('notify', (events, string) => {
        const focus = window.isFocused() ? true : false
        if (focus) {
            return
        }
        const n = new Notification({
            title: 'New Message',
            body: string,
            icon: "assets/icon.ico",
        })
        n.on('click', () => {
            window.focus()
            window.flashFrame(false)
        })
        n.show()
    })
})

app.setAppUserModelId(app.name)

