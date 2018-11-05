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

const packageJson = require('./package.json');
const appName = packageJson.name;

const { exec } = require('child_process');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

let willQuitApp = false;

const isDevEnv = !!process.env.BW_DEV;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
      width: 400,
      minWidth: isDevEnv ? 800 : 400,
      height: 800,
      minHeight: 400,
      frame: false
  });

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))


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

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  mainWindow.show();
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

let tray = null;
app.on('ready', () => {
    // hide dock icon on osx
    app.dock && app.dock.hide();
    const icons = {
        'linux' : 'iconTemplateWhite.png',
        'win32' : 'windows-icon.png'
    }
    const iconName = icons[process.platform] || 'iconTemplate.png'
    const iconPath = path.join(__dirname, 'assets', 'tray-icon', iconName)
    tray = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Builds'
        , click : () => { mainWindow.show(); } },
        { label: 'Quit'
        , click : () => { app.quit();} }
        ]
    )
    tray.setToolTip('build-watcher')
    tray.setContextMenu(contextMenu)

    const dataFileName = path.join(app.getPath("appData"),  appName, "build-watcher.json");

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
                        // data loaded, notify elm app
                        // and pass value as a string
                        // to do our decoding using Elm
                        reply({
                            kind: 'data-loaded',
                            success: true,
                            loadedFromFile: true,
                            data: data
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
        } else if (k === 'notif-clicked') {
            mainWindow.show();
        } else if (k === 'close-window') {
            mainWindow.hide();
        } else if (k === 'quit') {
            app.quit();
        } else if (k === 'invoke-external-tool') {
            const d = arg.data;
            const path = d.externalTool;
            const json = JSON.stringify(d);
            console.log("Invoke external tool :")
            console.log(json);
            exec(path,
                {
                    env: {
                        "BUILD_WATCHER_DATA": json
                    }
                },
                (err, stdout, stderr) => {
                if (err) {
                    console.log("err", err);
                } else {
                    console.log("all good");
                    console.log(stdout);
                }
            });
        }
    });

    // add menu for ctrl-c to work...
    if (!isDevEnv) {
        var template = [{
            label: "Application",
            submenu: [
                { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
                { type: "separator" },
                { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
            ]}, {
            label: "Edit",
            submenu: [
                { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
                { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
                { type: "separator" },
                { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
                { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
                { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
            ]}
        ];
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
})
