const electron = require('electron')
const app = electron.app
const ipcMain = electron.ipcMain
const BrowserWindow = electron.BrowserWindow
const Tray = electron.Tray
const Menu = electron.Menu
const path = require('path')
const url = require('url')
const Elm = require('./dist/app');
const fs = require('fs');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

let willQuitApp = false;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
      width: 800,
      // minWidth: 300,
      // maxWidth : 500,
      height: 800,
      minHeight: 400
  });

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('close', (e) => {
    if (willQuitApp) {
        /* the user tried to quit the app */
        mainWindow = null;
    } else {
        /* the user only tried to close the window */
        e.preventDefault();
        mainWindow.hide();
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

/* 'before-quit' is emitted when Electron receives
 * the signal to exit and wants to start closing windows */
app.on('before-quit', () => willQuitApp = true);

// Quit when all windows are closed.
// app.on('window-all-closed', function () {
//   // On OS X it is common for applications and their menu bar
//   // to stay active until the user quits explicitly with Cmd + Q
//   if (process.platform !== 'darwin') {
//     app.quit()
//   }
// })

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  mainWindow.show();
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

let tray = null;
app.on('ready', () => {
    const iconName = process.platform === 'win32' ? 'windows-icon.png' : 'iconTemplate.png'
    const iconPath = path.join(__dirname, 'assets', 'tray-icon', iconName)
    tray = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show B-loot'
        , click : () => { mainWindow.show(); } },
        { label: 'Quit'
        , click : () => { app.quit();} }
        ]
    )
    tray.setToolTip('B-loot build monitoring')
    tray.setContextMenu(contextMenu)

    const dataFileName = path.join(app.getPath("appData"), "b-loot.json");
    console.log("dataFileName", dataFileName);

    // Listen for async message from renderer process
    ipcMain.on('renderer-msg', (event, arg) => {

        function reply(data) {
            event.sender.send('main-msg', data);
        }

        const k = arg.kind;
        if (k === "save-data") {
            const data = JSON.stringify(arg.data, null, 4);
            fs.writeFile(dataFileName, data, (e) => {
                if (e) {
                    // unable to write the file : notify elm app
                    reply({
                        kind: 'data-saved',
                        success: false,
                        data: {
                            dataFileName: dataFileName,
                            error : e
                        }
                    })
                } else {
                    reply({
                        kind: 'data-saved',
                        success: true,
                        data: {
                            dataFileName: dataFileName
                        }
                    })
                }
            });

        } else if (k === 'load-data') {
            // load data from file if
            // we have one, otherwise start with empty data
            if (fs.existsSync(dataFileName)) {
                fs.readFile(dataFileName, "utf-8", (err, data) => {
                    if (err) {
                        reply({
                            kind: 'data-loaded',
                            success: false,
                            data: {
                                error : err
                            }
                        })
                    } else {
                        var loadedData = null;
                        try {
                            loadedData = JSON.parse(data);
                        } catch (e) {
                            reply({
                                kind: 'data-loaded',
                                success: false,
                                data: {
                                    error : err
                                }
                            })
                            return;
                        }
                        // data loaded, notify elm app
                        reply({
                            kind: 'data-loaded',
                            success: true,
                            loadedFromFile: true,
                            data: loadedData
                        })
                    }
                });
            } else {
                reply({
                    kind: 'data-loaded',
                    success: true,
                    loadedFromFile: false,
                    data: {
                        dataFileName: dataFileName
                    }
                })
            }
        } else if (k === 'open-url') {
            electron.shell.openExternal(arg.data);
        }
    });
})