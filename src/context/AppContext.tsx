import React, { createContext, useContext, useReducer } from 'react';
import { AppState, Department, Employee, AttendanceType } from '../types';

interface AppContextType {
  state: AppState;
  selectDepartment: (department: Department) => void;
  selectEmployee: (employee: Employee) => void;
  selectType: (type: AttendanceType) => void;
  complete: () => void;
  reset: () => void;
  setViewMode: (mode: 'attendance' | 'history') => void;
}

const AppContext = createContext<AppContextType | null>(null);

const initialState: AppState = {
  selectedDepartment: null,
  selectedEmployee: null,
  selectedType: null,
  isCompleted: false,
  viewMode: 'attendance'
};

type Action =
  | { type: 'SELECT_DEPARTMENT'; payload: Department }
  | { type: 'SELECT_EMPLOYEE'; payload: Employee }
  | { type: 'SELECT_TYPE'; payload: AttendanceType }
  | { type: 'COMPLETE' }
  | { type: 'RESET' }
  | { type: 'SET_VIEW_MODE'; payload: 'attendance' | 'history' };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_DEPARTMENT':
      return {
        ...state,
        selectedDepartment: action.payload,
        selectedEmployee: null,
        selectedType: null,
        isCompleted: false
      };
    case 'SELECT_EMPLOYEE':
      return {
        ...state,
        selectedEmployee: action.payload,
        selectedType: null,
        isCompleted: false
      };
    case 'SELECT_TYPE':
      return {
        ...state,
        selectedType: action.payload,
        isCompleted: false
      };
    case 'COMPLETE':
      return {
        ...state,
        isCompleted: true
      };
    case 'RESET':
      return { ...initialState, viewMode: state.viewMode };
    case 'SET_VIEW_MODE':
      return {
        ...initialState,
        viewMode: action.payload
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const selectDepartment = (department: Department) => {
    dispatch({ type: 'SELECT_DEPARTMENT', payload: department });
  };

  const selectEmployee = (employee: Employee) => {
    dispatch({ type: 'SELECT_EMPLOYEE', payload: employee });
  };

  const selectType = (type: AttendanceType) => {
    dispatch({ type: 'SELECT_TYPE', payload: type });
  };

  const complete = () => {
    dispatch({ type: 'COMPLETE' });
  };

  const reset = () => {
    dispatch({ type: 'RESET' });
  };

  const setViewMode = (mode: 'attendance' | 'history') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  return (
    <AppContext.Provider value={{
      state,
      selectDepartment,
      selectEmployee,
      selectType,
      complete,
      reset,
      setViewMode
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}