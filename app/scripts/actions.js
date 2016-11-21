import { remote } from 'electron';
const  { dialog } = remote;
import * as fs from 'fs';

import notification from './notification';
import state from './state';
import * as parser from  './parser';
import { project, sheetsToSVG } from './wingplan';

function saveKite() {
    let path = dialog.showSaveDialog();
    if (path === undefined) {
        return;
    }

    fs.writeFile(path, 'dddvdf', function (err) {
        if (err){
            notification.error("An error ocurred creating the file "+ err.message);
        }

        notification.log("The file has been succesfully saved");
    });
}

var openKite = state.actionCreator(() => {
    return function(dispatch, getState) {
        let file = dialog.showOpenDialog();
        if (!file) { return; }
        file = file[0];
        let wing = parser.parse(file);
        dispatch({ type: 'SET_WING_PARAMS', wing });
    };
});

var updateWing = state.actionCreator((wing) => {
    return function(dispatch, getState) {
        dispatch({ type: 'SET_WING_PARAMS', wing });
    };
});

var createSheets = state.actionCreator(() => {
    return function(dispatch, getState) {
        let wing = getState().wing;
        let sheets = project(wing);
        sheetsToSVG(sheets);
    };
});

export default {
    openKite,
    saveKite,
    updateWing,
    createSheets
};
