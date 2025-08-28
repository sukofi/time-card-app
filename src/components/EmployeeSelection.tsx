import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDatabase } from '../hooks/useDatabase';
import { TileButton } from './TileButton';
import { PageHeader } from './PageHeader';
import { EmployeeManagementModal } from './EmployeeManagementModal';

export function EmployeeSelection() {
  const { state, selectEmployee, reset } = useApp();
  const { getEmployeesByDepartment } = useDatabase();
  const [employees, setEmployees] = useState<any[]>([]);
  const [showEmployeeManagement, setShowEmployeeManagement] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 職員データを読み込む
  React.useEffect(() => {
    if (state.selectedDepartment?.id) {
      loadEmployees();
    }
  }, [state.selectedDepartment?.id]);

  const loadEmployees = async () => {
    if (!state.selectedDepartment?.id) return;
    
    setIsLoading(true);
    try {
      const employeeData = await getEmployeesByDepartment(state.selectedDepartment.id);
      setEmployees(employeeData.map(emp => ({
        id: emp.id,
        name: emp.name,
        departmentId: emp.department_id
      })));
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // タップ音を再生する関数
  const playTapSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const handleBack = () => {
    playTapSound();
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={`${state.selectedDepartment?.name} - 職員選択`}
          subtitle="職員名を選択してください"
          onBack={handleBack}
          onSettings={() => {
            playTapSound();
            setShowEmployeeManagement(true);
          }}
          onSettingsClose={() => {
            setShowEmployeeManagement(false);
            loadEmployees(); // 設定画面を閉じた後にデータを再読み込み
          }}
        />

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-xl text-gray-500">読み込み中...</p>
          </div>
        ) : (
          <>
            {/* 職員一覧 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8">
              {employees.map((employee) => (
                <TileButton
                  key={employee.id}
                  title={employee.name}
                  icon={User}
                  onClick={() => {
                    playTapSound();
                    selectEmployee(employee);
                  }}
                  className="h-32 md:h-40 lg:h-48"
                />
              ))}
            </div>

            {employees.length === 0 && (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-500">職員が登録されていません</p>
                <p className="text-gray-400">設定から職員を追加してください</p>
              </div>
            )}
          </>
        )}
      </div>

      <EmployeeManagementModal
        isOpen={showEmployeeManagement}
        onClose={() => {
          setShowEmployeeManagement(false);
          loadEmployees(); // モーダルを閉じた後にデータを再読み込み
        }}
        departmentId={state.selectedDepartment?.id || ''}
        departmentName={state.selectedDepartment?.name || ''}
      />
    </div>
  );
}