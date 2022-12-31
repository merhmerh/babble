const { app, BrowserWindow, Menu, MenuItem, ipcMain, screen, Tray, shell } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const fs = require('fs')
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

    window.webContents.openDevTools();

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

    ipcMain.handle('getConfig', () => {
        return configData
    })

    ipcMain.handle('updateConfig', (event, newConfig) => {
        console.log(newConfig);
        fs.writeFileSync(configPath, JSON.stringify(newConfig))
    })

    ipcMain.handle('decrypt', (e, string) => {
        const [iv, hash] = string.split(':').map(part => part, 'hex')
        const decipher = (() => {
            try {
                return crypto.createDecipheriv('aes-256-ctr', process.env.SECRET, Buffer.from(iv, 'hex'))
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

    ipcMain.handle('encrypt', (e, string) => {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-ctr', process.env.SECRET, iv)
        const encrypted = Buffer.concat([cipher.update(string), cipher.final()])
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    })

    window.on('focus', () => window.flashFrame(false))


    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify()
        autoUpdater.on('checking-for-update', () => {
        });
    }

    return window
}


app.whenReady().then(() => {
    const window = createWindow()
    const tray = new Tray(path.join(__dirname, 'build/icon.png'))

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open', click() { window.show() } },
        { type: 'separator' },
        { label: 'Exit', role: 'close', click() { app.quit() } },
    ])

    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
        window.show();
    })


    // setTimeout(() => {
    //     if (isDev) {
    //         Object.defineProperty(app, 'isPackaged', {
    //             get() {
    //                 return true;
    //             }
    //         });
    //         window.webContents.send('isUpdateReady', 'dev update')
    //         autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
    //         autoUpdater.checkForUpdates()
    //     } else {
    //         console.log('not dev');
    //         window.webContents.send('isUpdateReady', 'Checked for updbabbates')
    //         autoUpdater.checkForUpdatesAndNotify()
    //     }
    // }, 2000);



})



