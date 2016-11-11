import { remote } from 'electron';
import * as fs from 'fs';
import notification from './notification';
import state from './state';
import * as parser from  './parser';

const  { dialog } = remote;

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


export default {
    openKite,
    saveKite,
    updateWing
};
