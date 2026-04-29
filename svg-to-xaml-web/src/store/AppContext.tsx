import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import type { AppState, AppAction } from '../types';

const initialState: AppState = {
  files: [],
  selectedId: null,
  background: 'dark',
  iconSize: 80,
  searchQuery: '',
  toast: { message: '', visible: false },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_FILES':
      return { ...state, files: [...state.files, ...action.payload] };
    case 'SET_SELECTED':
      return { ...state, selectedId: action.payload };
    case 'SET_BACKGROUND':
      return { ...state, background: action.payload };
    case 'SET_ICON_SIZE':
      return { ...state, iconSize: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SHOW_TOAST':
      return { ...state, toast: { message: action.payload, visible: true } };
    case 'HIDE_TOAST':
      return { ...state, toast: { ...state.toast, visible: false } };
    case 'UPDATE_FILE_XAML':
      return {
        ...state,
        files: state.files.map(f =>
          f.id === action.payload.id
            ? {
                ...f,
                xamlGeometry: action.payload.xamlGeometry,
                xamlDrawingImage: action.payload.xamlDrawingImage,
                xamlButton: action.payload.xamlButton,
                isComplex: action.payload.isComplex,
              }
            : f
        ),
      };
    default:
      return state;
  }
}

const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}
