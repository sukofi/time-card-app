import React from 'react';
import { User, History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDatabase } from '../hooks/useDatabase';
import { TileButton } from './TileButton';
import { PageHeader } from './PageHeader';

export function HistoryEmployeeSelection() {
  const { state, selectEmployee, setViewMode } = useApp();
  const { getEmployeesByDepartment } = useDatabase();
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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
    setViewMode('history');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={`${state.selectedDepartment?.name} - 職員選択`}
          subtitle="履歴を確認したい職員を選択してください"
          onBack={handleBack}
        />

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <div className="flex items-center justify-center">
            <History className="w-8 h-8 text-purple-600 mr-4" />
            <h3 className="text-2xl font-bold text-gray-800">履歴確認</h3>
          </div>
          <p className="text-center text-gray-600 mt-4 text-lg">
            {state.selectedDepartment?.name}の職員の履歴を確認
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
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
                  className="h-32 md:h-40 lg:h-48 border-purple-200 hover:border-purple-300 hover:bg-purple-50"
                />
              ))}
            </div>

            {employees.length === 0 && (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-500">職員が登録されていません</p>
                <p className="text-gray-400">まず職員を登録してください</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}