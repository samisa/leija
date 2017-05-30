import { remote } from 'electron';
const  { dialog } = remote;
import * as fs from 'fs';

import notification from './notification';
import state from './state';
import * as parser from  './parser';
import { planSVGS } from './wingplan';
import * as bridles from './bridle';

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
        dispatch({ type: 'SET_BRIDLE_PARAMS', bridle: bridles.testBridleSpec });
        dispatch({ type: 'SET_WING_PARAMS', wing });
    };
});

var updateWing = state.actionCreator((wing) => {
    return function(dispatch, getState) {
        dispatch({ type: 'SET_WING_PARAMS', wing });
    };
});

var updateBridle = state.actionCreator((bridle) => {
    return function(dispatch, getState) {
        dispatch({ type: 'SET_BRIDLE_PARAMS', bridle });
    };
});

var createSheets = state.actionCreator(() => {
    return function(dispatch, getState) {
        let wing = getState().wing;
        let bridle = getState().bridle;
        let svgs = planSVGS({ bridle, wing });
        let path = dialog.showOpenDialog({ title: 'Select folder to save into', properties: [  'openDirectory' ]})[0];
        if (path === undefined || !fs.lstatSync(path).isDirectory()) {
            return;
        }

        svgs.map((svg, index) => {
            const fileName = index + '.svg';

            fs.writeFile(path + '/' + fileName, svg, function (err) {
                if (err){
                    notification.error("An error ocurred creating the file "+ err.message);
                }

                notification.log("The file has been succesfully saved");
            });
        });
    };
});

export default {
    openKite,
    saveKite,
    updateWing,
    updateBridle,
    createSheets
};
