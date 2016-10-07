import { app, BrowserWindow } from 'electron';
import * as parser from  './parser.js';

let mainWindow = null;

app.on('window-all-closed', () => {
  if (process.platform != 'darwin') {
    app.quit();
  }
});



app.on('ready', () => {
    mainWindow = new BrowserWindow({width: 800, height: 600});
    mainWindow.loadURL('file://' + __dirname + '/index.html');
    mainWindow.on('closed', () => {
        mainWindow = null;
    });


    //for debugging renderer  process
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.openDevTools();
        let wing = parser.parse('app/res/matowing.xwimp');
        mainWindow.webContents.on('devtools-opened', () => {
            setTimeout(() => {
                console.log('sending data');
                mainWindow.webContents.send('wingData' , { data: wing });
            }, 500);
        });
    });

    // let wing = parser.parse('app/res/matowing.xwimp');
    // mainWindow.webContents.on('did-finish-load', () => {
    //     mainWindow.webContents.send('wingData' , { data: wing});
    // });
});
