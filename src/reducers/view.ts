import * as Constants from "../constants";
import { IMapView } from "../api/common";
const assign = require("object-assign");

interface IViewReducerState {
    current: IMapView | null;
    initial: IMapView | null;
    history: IMapView[];
    mouse: any;
    historyIndex: number;
}

const INITIAL_STATE: IViewReducerState = {
    current: null,
    initial: null,
    mouse: null,
    history: [],
    historyIndex: -1
};

export function viewReducer(state = INITIAL_STATE, action = { type: '', payload: null }) {
    const payload: any = action.payload || {};
    switch (action.type) {
        case Constants.INIT_APP:
            {
                const newState = assign({}, state, {
                    initial: payload.initialView
                });
                return newState;
            }
        case Constants.MAP_PREVIOUS_VIEW:
            {
                const index = state.historyIndex - 1;
                const newState = assign({}, state, {
                    historyIndex: index,
                    current: state.history[index]
                });
                return newState;
            }
        case Constants.MAP_NEXT_VIEW:
            {
                const index = state.historyIndex + 1;
                const newState = assign({}, state, {
                    historyIndex: index,
                    current: state.history[index]
                });
                return newState;
            }
        case Constants.UPDATE_MOUSE_COORDINATES:
            {
                return assign({}, state, { mouse: action.payload });
            }
        case Constants.MAP_SET_SCALE: 
            {
                let view = state.current;
                if (typeof view === 'object') {
                    view = assign({}, view, { scale: action.payload });
                }
                const newState = assign({}, state, {
                    current: view
                });
                if (view) {
                    newState.history.push({
                        x: view.x,
                        y: view.y,
                        scale: view.scale
                    });
                    return newState;
                }
            }
        case Constants.MAP_SET_VIEW:
            {
                const newState = assign({}, state, {
                    current: action.payload
                });

                newState.historyIndex++;
                newState.history[newState.historyIndex] = action.payload;
                //If we slotted at a position that is not the end of the array
                //remove everything after it
                if (newState.history.length > newState.historyIndex + 1) {
                    newState.history.splice(newState.historyIndex + 1);
                }
                return newState;
            }
    }
    return state;
}