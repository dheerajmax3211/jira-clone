import React, { useState, useEffect } from 'react';
import { X, Layout, Type, Plus, Trash } from 'lucide-react';
import { Board, BoardColumn } from '../types';

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (board: Partial<Board>) => void;
  editingBoard?: Board;
}

export const BoardModal: React.FC<BoardModalProps> = ({ isOpen, onClose, onSave, editingBoard }) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState<'scrum' | 'kanban'>('kanban');
  const [columns, setColumns] = useState<BoardColumn[]>([]);

  const defaultColumns: BoardColumn[] = [
    { id: 'Todo', title: 'To Do', limit: 0 },
    { id: 'In Progress', title: 'In Progress', limit: 4 },
    { id: 'Review', title: 'Review', limit: 3 },
    { id: 'Done', title: 'Done', limit: 0 },
  ];

  useEffect(() => {
    if (editingBoard) {
      setName(editingBoard.name);
      setKey(editingBoard.key);
      setType(editingBoard.type);
      setColumns(editingBoard.columns || defaultColumns);
    } else {
      setName('');
      setKey('');
      setType('kanban');
      setColumns(defaultColumns);
    }
  }, [editingBoard, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !key) return;
    onSave({ 
      id: editingBoard?.id, 
      name, 
      key: key.toUpperCase(), 
      type,
      columns
    });
    onClose();
  };

  const addColumn = () => {
    const newCol = { id: `Col ${columns.length + 1}`, title: `Column ${columns.length + 1}`, limit: 0 };
    setColumns([...columns, newCol]);
  };

  const updateColumn = (index: number, field: keyof BoardColumn, value: string | number) => {
    const newCols = [...columns];
    newCols[index] = { ...newCols[index], [field]: value };
    // Also update ID if title changes for simplicity in this MVP, though ideally ID is static
    if(field === 'title') newCols[index].id = value as string;
    setColumns(newCols);
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {editingBoard ? 'Edit Project' : 'Create Project'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Name</label>
                <input 
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900"
                  placeholder="e.g. Mobile App Redesign"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingBoard && !key && e.target.value.length >= 3) {
                      setKey(e.target.value.substring(0, 3).toUpperCase());
                    }
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Key</label>
                <input 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase font-mono bg-white text-gray-900"
                  placeholder="e.g. APP"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Template</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('kanban')}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-2 ${type === 'kanban' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                  >
                    <Layout size={24} />
                    <span className="text-xs font-bold">Kanban</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('scrum')}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-2 ${type === 'scrum' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                  >
                    <Type size={24} />
                    <span className="text-xs font-bold">Scrum</span>
                  </button>
                </div>
              </div>
          </div>

          {/* Column Configuration */}
          <div className="pt-4 border-t border-gray-100">
             <div className="flex justify-between items-center mb-3">
                 <label className="block text-sm font-semibold text-gray-700">Board Columns</label>
                 <button type="button" onClick={addColumn} className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded">
                     <Plus size={14} /> Add Column
                 </button>
             </div>
             <div className="space-y-2">
                 {columns.map((col, idx) => (
                     <div key={idx} className="flex gap-2 items-center">
                         <div className="cursor-move text-gray-300">:::</div>
                         <input 
                            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white text-gray-900"
                            value={col.title}
                            onChange={e => updateColumn(idx, 'title', e.target.value)}
                            placeholder="Column Name"
                         />
                         <input 
                            type="number"
                            className="w-20 border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white text-gray-900"
                            value={col.limit || ''}
                            onChange={e => updateColumn(idx, 'limit', parseInt(e.target.value))}
                            placeholder="Limit"
                            title="WIP Limit (0 for unlimited)"
                         />
                         <button 
                            type="button" 
                            onClick={() => removeColumn(idx)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            disabled={columns.length <= 1}
                         >
                             <Trash size={16} />
                         </button>
                     </div>
                 ))}
             </div>
          </div>

        </form>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!name || !key}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:shadow-none"
            >
              {editingBoard ? 'Save Changes' : 'Create Project'}
            </button>
        </div>
      </div>
    </div>
  );
};