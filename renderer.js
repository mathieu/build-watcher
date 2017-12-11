// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var {ipcRenderer, remote} = require('electron');
var main = remote.require("./main");

var Elm = require('./dist/app');
var a = Elm.App.fullscreen();

function sendToMain(data) {
    ipcRenderer.send('renderer-msg', data)
}

a.ports.saveData.subscribe(function(data) {
    sendToMain({
         kind: "save-data",
         data: data
     });
});

a.ports.loadData.subscribe(function() {
    sendToMain({
        kind: "load-data"
    })
})

a.ports.openURL.subscribe(function(url) {
    sendToMain({
        kind: "open-url",
        data: url
    })
})

ipcRenderer.on('main-msg', (event, arg) => {
    if (arg.kind === 'data-loaded') {
        if (arg.success) {
            if (arg.loadedFromFile) {
                a.ports.onDataLoadSuccess.send(arg.data);
            } else {
                a.ports.onDataLoadFileNotFound.send(arg.data);
            }
        } else {
            a.ports.onDataLoadError.send(arg.data);
        }
    } else if (arg.kind == 'data-saved') {
        if (arg.success) {
            a.ports.onDataSaveSuccess.send(arg.data);
        } else {
            a.ports.onDataSaveError.send(arg.data);
        }
    }
});