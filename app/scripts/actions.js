import { remote } from 'electron';
const  { dialog } = remote;
import * as fs from 'fs';

import notification from './notification';
import state from './state';
import * as parser from  './parser';
import { planSVGS } from './wingplan';
import * as bridles from './bridle';
import { saveFile, exportXFLR5 } from './parser';

const saveKite = state.actionCreator(() => {
    return function(dispatch, getState) {
        const wing = getState().wing;
        const bridle = getState().bridle;
        const name = getState().name;


        let path = dialog.showSaveDialog();
        if (path === undefined) {
            return;
        }

        saveFile(path, JSON.stringify({ wing, bridle, name }));
    };
});

const exportToXFLR5 = state.actionCreator(() => {
    return function(dispatch, getState) {
        const { wing, name } = getState();

        const path = dialog.showOpenDialog({
            properties: ['openDirectory']
        });

        if (path === undefined) {
            return;
        }

        exportXFLR5(path, { wing, name });
    };
});

var openKite = state.actionCreator(() => {
    return function(dispatch, getState) {
        let file = dialog.showOpenDialog();
        if (!file) { return; }
        file = file[0];
        const { wing, bridle, name } = parser.loadJson(file);
        dispatch({ type: 'SET_BRIDLE_PARAMS', bridle: bridle || bridles.testBridleSpec });
        dispatch({ type: 'SET_WING_PARAMS', wing });
        dispatch({ type: 'SET_KITE_NAME', name }); //TODO...
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
    createSheets,
    exportToXFLR5
};
