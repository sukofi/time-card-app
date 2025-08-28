import React, { useState } from 'react';
import { X, Plus, Trash2, GripVertical, Edit2, Save } from 'lucide-react';
// import { useLocalStorage } from '../hooks/useLocalStorage'; // 削除済み
import { Department } from '../types';

interface DepartmentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepartmentManagementModal({ isOpen, onClose }: DepartmentManagementModalProps) {
  // const [departments, setDepartments] = useLocalStorage<Department[]>('departments', []); // 削除済み
  const [departments, setDepartments] = useState<Department[]>([]); // 一時的にuseStateを使用
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  // 並び順の入れ替え
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...departments];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, removed);
    // orderを再設定
    setDepartments(updated.map((d, i) => ({ ...d, order: i })));
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  // 編集開始
  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };
  // 編集保存
  const saveEdit = (id: string) => {
    setDepartments(departments.map(d => d.id === id ? { ...d, name: editName } : d));
    setEditingId(null);
    setEditName('');
  };
  // 部署追加
  const addDepartment = () => {
    if (!newDeptName.trim()) return;
    const newDept: Department = {
      id: `dept_${Date.now()}`,
      name: newDeptName.trim(),
      order: departments.length
    };
    setDepartments([...departments, newDept]);
    setNewDeptName('');
  };
  // 部署削除
  const deleteDepartment = (id: string) => {
    const updated = departments.filter(d => d.id !== id).map((d, i) => ({ ...d, order: i }));
    setDepartments(updated);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-xl max-w-lg md:max-w-xl w-full max-h-[85vh] overflow-y-auto">
        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">部署管理</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* 追加フォーム */}
          <div className="flex gap-3 md:gap-4 mb-4">
            <input
              type="text"
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              placeholder="新しい部署名を入力"
              className="flex-1 px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              onKeyPress={e => e.key === 'Enter' && addDepartment()}
            />
            <button
              onClick={addDepartment}
              disabled={!newDeptName.trim()}
              className="px-4 md:px-6 py-2 md:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm md:text-base"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1" />追加
            </button>
          </div>
          {/* 部署リスト */}
          <ul className="space-y-1 md:space-y-2">
            {departments.sort((a, b) => a.order - b.order).map((dept, idx) => (
              <li
                key={dept.id}
                className="flex items-center gap-2 py-2 md:py-3 px-2 md:px-3 rounded hover:bg-gray-50 group"
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => { e.preventDefault(); handleDragOver(idx); }}
                onDragEnd={handleDragEnd}
              >
                <GripVertical className="w-4 h-4 md:w-5 md:h-5 text-gray-400 cursor-move mr-2" />
                {editingId === dept.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 px-2 md:px-3 py-1 md:py-2 border rounded text-sm md:text-base"
                      onKeyPress={e => e.key === 'Enter' && saveEdit(dept.id)}
                    />
                    <button onClick={() => saveEdit(dept.id)} className="ml-2 text-blue-600"><Save className="w-4 h-4 md:w-5 md:h-5" /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm md:text-base">{dept.name}</span>
                    <button onClick={() => startEdit(dept.id, dept.name)} className="ml-2 text-gray-500 hover:text-blue-600"><Edit2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                  </>
                )}
                <button onClick={() => deleteDepartment(dept.id)} className="ml-2 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 