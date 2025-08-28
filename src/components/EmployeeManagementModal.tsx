import React, { useState } from 'react';
import { X, Plus, Trash2, Users } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useGoogleSheets } from '../hooks/useGoogleSheets';

interface EmployeeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string;
  departmentName: string;
}

export function EmployeeManagementModal({ 
  isOpen, 
  onClose, 
  departmentId, 
  departmentName 
}: EmployeeManagementModalProps) {
  const { 
    addEmployee: addEmployeeToDb, 
    getEmployeesByDepartment, 
    deleteEmployee: deleteEmployeeFromDb,
    getSetting
  } = useDatabase();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [googleSheetsSettings, setGoogleSheetsSettings] = useState({ 
    serviceAccountKey: '', 
    spreadsheetId: '' 
  });
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [showDeleteMode, setShowDeleteMode] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { addEmployeeToSheet, isConfigured } = useGoogleSheets(
    googleSheetsSettings.serviceAccountKey && googleSheetsSettings.spreadsheetId 
      ? googleSheetsSettings 
      : undefined
  );

  // データを読み込む
  React.useEffect(() => {
    if (isOpen && departmentId) {
      loadData();
    }
  }, [isOpen, departmentId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 職員データを読み込み
      const employeeData = await getEmployeesByDepartment(departmentId);
      setEmployees(employeeData.map(emp => ({
        id: emp.id,
        name: emp.name,
        departmentId: emp.department_id
      })));

      // Google Sheets設定を読み込み
      const serviceAccountKey = await getSetting('googleSheetsServiceAccountKey') || '';
      const spreadsheetId = await getSetting('googleSheetsSpreadsheetId') || '';
      setGoogleSheetsSettings({ serviceAccountKey, spreadsheetId });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const addEmployee = async () => {
    if (newEmployeeName.trim() && departmentId) {
      setIsAddingEmployee(true);
      
      try {
        const newEmployee = await addEmployeeToDb(newEmployeeName.trim(), departmentId);
        if (!newEmployee) {
          throw new Error('Failed to add employee to database');
        }

        // 状態を更新
        setEmployees([...employees, {
          id: newEmployee.id,
          name: newEmployee.name,
          departmentId: newEmployee.department_id
        }]);
        
        // Google Sheetsにも追加（設定されている場合）
        if (isConfigured) {
          await addEmployeeToSheet(departmentName, newEmployee.name);
        }
        
        setNewEmployeeName('');
      } catch (error) {
        console.error('Error adding employee:', error);
        alert('職員の追加中にエラーが発生しました。');
      } finally {
        setIsAddingEmployee(false);
      }
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    try {
      const success = await deleteEmployeeFromDb(employeeId);
      if (success) {
        setEmployees(employees.filter(emp => emp.id !== employeeId));
      } else {
        alert('職員の削除に失敗しました。');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('職員の削除中にエラーが発生しました。');
    }
  };

  const handleClose = () => {
    setShowDeleteMode(false);
    setNewEmployeeName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-800">
                {departmentName} - 職員管理
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 職員追加フォーム */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-green-600" />
              新しい職員を追加
            </h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="職員名を入力"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addEmployee()}
              />
              <button
                onClick={addEmployee}
                disabled={!newEmployeeName.trim() || isAddingEmployee}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isAddingEmployee ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    追加中...
                  </>
                ) : (
                  '追加'
                )}
              </button>
            </div>
          </div>

          {/* 職員一覧 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">職員一覧</h3>
              <button
                onClick={() => setShowDeleteMode(!showDeleteMode)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  showDeleteMode 
                    ? 'bg-gray-500 text-white hover:bg-gray-600' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {showDeleteMode ? '削除モード終了' : '削除モード'}
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">読み込み中...</p>
              </div>
            ) : employees.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {employees.map((employee) => (
                  <div key={employee.id} className="relative">
                    <div className={`
                      p-4 bg-white border-2 rounded-lg transition-all
                      ${showDeleteMode 
                        ? 'border-red-200 bg-red-50' 
                        : 'border-gray-200 hover:border-blue-300'
                      }
                    `}>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="font-medium text-gray-800">{employee.name}</p>
                      </div>
                    </div>
                    {showDeleteMode && (
                      <button
                        onClick={() => deleteEmployee(employee.id)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">職員が登録されていません</p>
                <p className="text-sm text-gray-400">上記のフォームから職員を追加してください</p>
              </div>
            )}
          </div>

          {/* 閉じるボタン */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              完了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}