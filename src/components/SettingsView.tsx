import React from 'react';
import { Users, Trash2, Edit2, Settings as SettingsIcon, Plus } from 'lucide-react';
import { Profile, Board } from '../types';

interface SettingsViewProps {
  profiles: Profile[];
  activeBoard?: Board;
  onEditBoard: () => void;
  onDeleteBoard: () => void;
  onAddMember?: (name: string, email: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ profiles, activeBoard, onEditBoard, onDeleteBoard, onAddMember }) => {
  const handleAddMemberClick = () => {
      if (!onAddMember) return;
      const name = window.prompt("Enter new member's name:");
      if (!name) return;
      const email = window.prompt("Enter new member's email:");
      if (!email) return;
      
      onAddMember(name, email);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto overflow-y-auto h-full font-sans">
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Project Settings</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Board Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg flex items-center text-gray-800">
                        <SettingsIcon className="mr-2 text-slate-600" size={20} />
                        Board Settings
                    </h3>
                </div>
                
                {activeBoard ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Current Project</label>
                            <div className="text-lg font-bold text-gray-900 mt-1">{activeBoard.name}</div>
                            <div className="text-sm text-gray-500 font-mono mt-0.5">Key: {activeBoard.key}</div>
                            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-block mt-2 uppercase font-bold">{activeBoard.type}</div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={onEditBoard}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
                            >
                                <Edit2 size={16} /> Edit Details
                            </button>
                            <button 
                                onClick={() => {
                                    if(confirm('Are you sure you want to delete this board? This cannot be undone.')) {
                                        onDeleteBoard();
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-semibold py-2.5 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} /> Delete Project
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-500 italic text-sm">No project selected.</div>
                )}
            </div>

            {/* Team Management */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg flex items-center text-gray-800">
                        <Users className="mr-2 text-blue-600" size={20} />
                        Team Members
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{profiles.length} Members</span>
                        {onAddMember && (
                            <button 
                                onClick={handleAddMemberClick}
                                className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                title="Add Member"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-800">
                    Users automatically appear here when they sign up. In local mode, you can add them manually.
                </div>

                <div className="space-y-3">
                    {profiles.map(profile => (
                        <div key={profile.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all group">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                    {profile.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                                    <p className="text-xs text-gray-500">{profile.email}</p>
                                </div>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{profile.role}</span>
                        </div>
                    ))}
                    {profiles.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-8 italic">No team members found.</p>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};