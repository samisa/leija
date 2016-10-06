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
    mainWindow.webContents.openDevTools();
    mainWindow.webContents.on('did-finish-load', () => {
        let wing = parser.parse('app/res/matowing.xwimp');
        mainWindow.webContents.on('devtools-opened', () => {
            setTimeout(() => {
                mainWindow.webContents.send('wingData' , { data: wing});
            },1000);
        });
    });

    // let wing = parser.parse('app/res/matowing.xwimp');
    // mainWindow.webContents.on('did-finish-load', () => {
    //     mainWindow.webContents.send('wingData' , { data: wing});
    // });
});
