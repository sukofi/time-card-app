import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DepartmentSelection } from './components/DepartmentSelection';
import { HistoryDepartmentSelection } from './components/HistoryDepartmentSelection';
import { HistoryEmployeeSelection } from './components/HistoryEmployeeSelection';
import { EmployeeSelection } from './components/EmployeeSelection';
import { AttendanceTypeSelection } from './components/AttendanceTypeSelection';
import { CompletionScreen } from './components/CompletionScreen';
import { AttendanceHistoryView } from './components/AttendanceHistoryView';

function AppContent() {
  const { state } = useApp();

  // 履歴確認モード
  if (state.viewMode === 'history') {
    if (state.selectedDepartment && state.selectedEmployee) {
      return <AttendanceHistoryView />;
    }
    
    if (state.selectedDepartment) {
      return <HistoryEmployeeSelection />;
    }
    
    return <HistoryDepartmentSelection />;
  }

  // 通常の打刻モード
  if (state.isCompleted || (state.selectedDepartment && state.selectedEmployee && state.selectedType)) {
    return <CompletionScreen />;
  }

  if (state.selectedDepartment && state.selectedEmployee) {
    return <AttendanceTypeSelection />;
  }

  if (state.selectedDepartment) {
    return <EmployeeSelection />;
  }

  return <DepartmentSelection />;
}

function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-100">
        <AppContent />
      </div>
    </AppProvider>
  );
}

export default App;