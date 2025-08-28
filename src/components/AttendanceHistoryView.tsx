import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowLeft, User, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDatabase } from '../hooks/useDatabase';
import { PageHeader } from './PageHeader';

export function AttendanceHistoryView() {
  const { state, reset } = useApp();
  const { getMonthlyAttendanceRecords } = useDatabase();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  });

  // 月間記録を読み込む
  useEffect(() => {
    if (state.selectedDepartment && state.selectedEmployee) {
      loadMonthlyRecords();
    }
  }, [state.selectedDepartment, state.selectedEmployee]);

  const loadMonthlyRecords = async () => {
    if (!state.selectedDepartment || !state.selectedEmployee) return;
    
    setIsLoading(true);
    try {
      const records = await getMonthlyAttendanceRecords(
        state.selectedDepartment.id,
        state.selectedEmployee.id,
        currentMonth.year,
        currentMonth.month
      );
      
      // データ形式を統一
      setAttendanceRecords(records.map(record => ({
        id: record.id,
        departmentId: record.department_id,
        departmentName: record.department_name,
        employeeId: record.employee_id,
        employeeName: record.employee_name,
        type: record.type,
        typeName: record.type_name,
        timestamp: record.timestamp,
        date: record.date
      })));
    } catch (error) {
      console.error('Error loading monthly records:', error);
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

  // 日付ごとにグループ化
  const groupRecordsByDate = (records: any[]) => {
    const grouped: { [key: string]: AttendanceRecord[] } = {};
    
    records.forEach(record => {
      const date = new Date(record.timestamp).toLocaleDateString('ja-JP');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });
    
    // 日付順にソート
    const sortedEntries = Object.entries(grouped).sort((a, b) => {
      return new Date(b[1][0].timestamp).getTime() - new Date(a[1][0].timestamp).getTime();
    });
    
    return sortedEntries;
  };

  const groupedRecords = groupRecordsByDate(attendanceRecords);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'checkin':
        return 'bg-green-100 text-green-800';
      case 'checkout':
        return 'bg-red-100 text-red-800';
      case 'out':
        return 'bg-yellow-100 text-yellow-800';
      case 'return':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'checkin':
        return '🟢';
      case 'checkout':
        return '🔴';
      case 'out':
        return '🟡';
      case 'return':
        return '🔵';
      default:
        return '⚪';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="打刻履歴"
          subtitle={`${currentMonth.year}年${currentMonth.month}月の記録`}
          onBack={handleBack}
        />

        {/* 選択内容表示 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <div className="flex items-center mb-4">
            <Calendar className="w-8 h-8 text-purple-600 mr-4" />
            <h3 className="text-2xl font-bold text-gray-800">確認中の情報</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-lg">
            <div className="flex items-center">
              <Building2 className="w-6 h-6 text-gray-500 mr-3" />
              <span className="text-gray-600">部署：</span>
              <span className="font-semibold text-purple-600 ml-3">
                {state.selectedDepartment?.name}
              </span>
            </div>
            <div className="flex items-center">
              <User className="w-6 h-6 text-gray-500 mr-3" />
              <span className="text-gray-600">職員：</span>
              <span className="font-semibold text-purple-600 ml-3">
                {state.selectedEmployee?.name}
              </span>
            </div>
          </div>
        </div>

        {/* 履歴表示 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center mb-6">
            <Clock className="w-8 h-8 text-purple-600 mr-4" />
            <h3 className="text-2xl font-bold text-gray-800">
              打刻履歴 ({attendanceRecords.length}件)
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-xl text-gray-500">読み込み中...</p>
            </div>
          ) : groupedRecords.length > 0 ? (
            <div className="space-y-6">
              {groupedRecords.map(([date, records]) => (
                <div key={date} className="border-l-4 border-purple-200 pl-6">
                  <div className="flex items-center mb-3">
                    <div className="bg-purple-100 rounded-full p-2 mr-3">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">{date}</h4>
                    <span className="ml-2 text-sm text-gray-500">
                      ({records.length}件)
                    </span>
                  </div>
                  
                  <div className="space-y-2 ml-9">
                    {records
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center">
                            <span className="text-lg mr-3">
                              {getTypeIcon(record.type)}
                            </span>
                            <div>
                              <span className="font-medium text-gray-800">
                                {record.typeName}
                              </span>
                              <div className="text-sm text-gray-500">
                                {new Date(record.timestamp).toLocaleTimeString('ja-JP', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                            {record.typeName}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-500 mb-2">今月の打刻履歴がありません</p>
              <p className="text-gray-400">
                {currentMonth.year}年{currentMonth.month}月の記録はまだありません
              </p>
            </div>
          )}
        </div>

        {/* 統計情報 */}
        {attendanceRecords.length > 0 && !isLoading && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">今月の統計</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['checkin', 'checkout', 'out', 'return'].map((type) => {
                const count = attendanceRecords.filter(r => r.type === type).length;
                const typeName = attendanceRecords.find(r => r.type === type)?.typeName || type;
                return (
                  <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl mb-1">{getTypeIcon(type)}</div>
                    <div className="text-2xl font-bold text-gray-800">{count}</div>
                    <div className="text-sm text-gray-600">{typeName}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}