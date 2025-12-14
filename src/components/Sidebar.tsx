import React, { useState, useRef, useEffect } from 'react';
import { Layout, List, Settings, PlusCircle, Box, ChevronDown, Check, Plus } from 'lucide-react';
import { Board } from '../types';

interface SidebarProps {
  currentView: 'board' | 'backlog' | 'settings';
  setView: (view: 'board' | 'backlog' | 'settings') => void;
  onOpenImport: () => void;
  boards: Board[];
  activeBoardId: string;
  onChangeBoard: (id: string) => void;
  onCreateBoard: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  onOpenImport, 
  boards, 
  activeBoardId, 
  onChangeBoard,
  onCreateBoard 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeBoard = boards.find(b => b.id === activeBoardId);
  const isScrum = activeBoard?.type === 'scrum';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-64 bg-[#0F172A] text-slate-300 h-full flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Project Switcher */}
      <div className="relative" ref={dropdownRef}>
        <div 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-4 mx-2 mt-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group flex items-center justify-between"
        >
            <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded flex items-center justify-center text-white shadow-lg shrink-0">
                    <Box size={16} />
                </div>
                <div className="min-w-0">
                    <h3 className="font-bold text-slate-100 text-sm leading-tight truncate">
                        {activeBoard ? activeBoard.name : 'Select Project'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium truncate">Software Project</p>
                </div>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
            <div className="absolute top-full left-2 right-2 mt-1 bg-[#1E293B] border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="max-h-48 overflow-y-auto py-1">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recent Projects</div>
                    {boards.map(board => (
                        <button
                            key={board.id}
                            onClick={() => {
                                onChangeBoard(board.id);
                                setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-600/20 hover:text-blue-400 transition-colors"
                        >
                            <span className="text-sm font-medium truncate">{board.name}</span>
                            {board.id === activeBoardId && <Check size={14} className="text-blue-500" />}
                        </button>
                    ))}
                </div>
                <div className="border-t border-slate-700 p-2">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onCreateBoard();
                            setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-center space-x-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors"
                    >
                        <Plus size={14} />
                        <span>Create Project</span>
                    </button>
                </div>
            </div>
        )}
      </div>
      
      {/* Navigation */}
      <div className="flex-1 py-6 space-y-1 overflow-y-auto px-2">
        <div className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">Planning</div>
        <button 
            onClick={() => setView('board')}
            className={`w-full flex items-center px-4 py-2 rounded-md transition-all ${currentView === 'board' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-white/5 hover:text-slate-100'}`}
        >
            <Layout size={18} className={`mr-3 ${currentView === 'board' ? 'text-blue-500' : 'text-slate-500'}`} />
            <span className="text-sm">{isScrum ? 'Active Sprint' : 'Kanban Board'}</span>
        </button>
        
        {isScrum && (
            <button 
                onClick={() => setView('backlog')}
                className={`w-full flex items-center px-4 py-2 rounded-md transition-all ${currentView === 'backlog' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-white/5 hover:text-slate-100'}`}
            >
                <List size={18} className={`mr-3 ${currentView === 'backlog' ? 'text-blue-500' : 'text-slate-500'}`} />
                <span className="text-sm">Backlog</span>
            </button>
        )}

        <div className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Development</div>
        <button 
            onClick={onOpenImport}
            className="w-full flex items-center px-4 py-2 rounded-md hover:bg-white/5 hover:text-slate-100 transition-all text-slate-400"
        >
            <PlusCircle size={18} className="mr-3 text-slate-500" />
            <span className="text-sm">Import Issues</span>
        </button>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => setView('settings')}
          className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${currentView === 'settings' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 text-slate-400'}`}
        >
          <Settings size={18} className="mr-3" />
          <span className="text-sm">Project Settings</span>
        </button>
      </div>
    </div>
  );
};