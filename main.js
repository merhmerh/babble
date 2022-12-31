const { app, BrowserWindow, Menu, MenuItem, ipcMain, screen, Tray } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

const isDev = (() => {
    return process.env.NODE_ENV == 'dev' ? true : false
})()

console.log(`is dev env: ${isDev}`);

// try {
//     require('electron-reloader')(module);
// } catch { }

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

    window.on('focus', () => window.flashFrame(false))


    Object.defineProperty(app, 'isPackaged', {
        get() {
            return true;
        }
    });

    if (isDev) {
        autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
        autoUpdater.checkForUpdates()
    }
    // autoUpdater.checkForUpdates()
    // autoUpdater.checkForUpdatesAndNotify()

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
})



