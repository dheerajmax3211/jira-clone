import React, { useState } from 'react';
import { Ticket, Sprint } from '../types';
import { ChevronDown, ChevronRight, Plus, Edit2, Calendar, CheckCircle } from 'lucide-react';

interface BacklogProps {
  tickets: Ticket[];
  sprints: Sprint[];
  onTicketClick: (ticket: Ticket) => void;
  onCreateSprint: () => void;
  onUpdateSprint: (sprint: Sprint) => void;
}

export const Backlog: React.FC<BacklogProps> = ({ tickets, sprints, onTicketClick, onCreateSprint, onUpdateSprint }) => {
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const handleCompleteSprint = (sprint: Sprint) => {
      const updated = { ...sprint, status: 'closed' as const };
      onUpdateSprint(updated);
  };

  const handleStartSprint = (sprint: Sprint) => {
      const updated = { ...sprint, status: 'active' as const, start_date: new Date().toISOString() };
      onUpdateSprint(updated);
  };

  const renderSprintModal = () => {
      if (!editingSprint) return null;
      return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl ring-1 ring-slate-900/5">
                  <h3 className="text-xl font-bold mb-6 text-slate-800">Edit {editingSprint.name}</h3>
                  <div className="space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sprint Name</label>
                          <input 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            value={editingSprint.name}
                            onChange={e => setEditingSprint({...editingSprint, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sprint Goal</label>
                          <textarea 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white resize-none"
                            placeholder="What do we want to achieve?"
                            value={editingSprint.goal || ''}
                            onChange={e => setEditingSprint({...editingSprint, goal: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label>
                              <input 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
                                // Extract YYYY-MM-DD from ISO string safely
                                value={editingSprint.start_date ? editingSprint.start_date.split('T')[0] : ''}
                                onChange={e => {
                                    // Store as simple ISO date string (YYYY-MM-DD) which is valid for timestamp in Postgres often,
                                    // or append T00:00:00Z to ensure strict UTC.
                                    // We append noon UTC to avoid date shifting issues in UI display.
                                    const date = e.target.value ? `${e.target.value}T12:00:00.000Z` : undefined;
                                    setEditingSprint({...editingSprint, start_date: date})
                                }}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">End Date</label>
                              <input 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
                                value={editingSprint.end_date ? editingSprint.end_date.split('T')[0] : ''}
                                onChange={e => {
                                    const date = e.target.value ? `${e.target.value}T12:00:00.000Z` : undefined;
                                    setEditingSprint({...editingSprint, end_date: date})
                                }}
                              />
                          </div>
                      </div>
                  </div>
                  <div className="mt-8 flex justify-end space-x-3 border-t border-slate-100 pt-5">
                      <button onClick={() => setEditingSprint(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                      <button 
                        onClick={() => { onUpdateSprint(editingSprint); setEditingSprint(null); }}
                        className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all"
                      >
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )
  };

  const renderTicketRow = (ticket: Ticket) => (
    <div 
        key={ticket.id} 
        onClick={() => onTicketClick(ticket)}
        className="flex items-center p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer group bg-white transition-all"
    >
        <div className="mr-3 w-6 flex justify-center">
             {ticket.type === 'Bug' ? <div className="w-3 h-3 rounded-[3px] bg-red-500" /> : 
              ticket.type === 'Epic' ? <div className="w-3 h-3 rounded-[3px] bg-purple-600" /> :
              <div className="w-3 h-3 rounded-[3px] bg-blue-500" />}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center">
                <span className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors">{ticket.title}</span>
                {ticket.labels?.map(l => (
                    <span key={l} className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded font-medium border border-slate-200">{l}</span>
                ))}
            </div>
        </div>
        <div className="flex items-center space-x-6 text-xs text-slate-500 shrink-0 ml-4">
            <span className={`px-2 py-0.5 rounded uppercase font-bold tracking-wide text-[10px] ${
                ticket.status === 'Done' ? 'bg-green-100 text-green-700' :
                ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-600'
            }`}>{ticket.status}</span>
            
            {ticket.story_points ? (
                <span className="bg-slate-100 px-2 py-0.5 rounded-full font-bold min-w-[24px] text-center">{ticket.story_points}</span>
            ) : <span className="w-6 text-center text-slate-300">-</span>}

            <span className="font-mono w-14 text-right">{ticket.id.slice(0, 4).toUpperCase()}</span>
        </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
       {renderSprintModal()}
       <div className="px-8 py-6 border-b bg-white flex justify-between items-center shadow-sm z-10 sticky top-0">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Backlog</h2>
            <p className="text-sm text-slate-500 mt-1">Plan your sprints and manage your backlog</p>
        </div>
        <button onClick={onCreateSprint} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-slate-200 shadow-sm">
            Create Sprint
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Active Sprints */}
        {sprints.filter(s => s.status !== 'closed').map(sprint => {
             const sprintTickets = tickets.filter(t => t.sprint_id === sprint.id);
             return (
                <div key={sprint.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5">
                    <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <ChevronDown size={18} className="text-slate-400" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-lg">{sprint.name}</span>
                                    {sprint.status === 'active' && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Active</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {sprint.goal && <span className="text-xs text-slate-500 italic border-r border-slate-300 pr-2 mr-0">{sprint.goal}</span>}
                                    <span className="text-xs text-slate-400">{sprintTickets.length} issues</span>
                                    <span className="text-xs text-slate-400">{sprintTickets.reduce((acc, t) => acc + (t.story_points || 0), 0)} story points</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={() => setEditingSprint(sprint)} className="p-2 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                                <Edit2 size={16} />
                            </button>
                            {sprint.status === 'active' ? (
                                <button 
                                    onClick={() => handleCompleteSprint(sprint)}
                                    className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200 border border-slate-200 transition-all"
                                >
                                    Complete Sprint
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleStartSprint(sprint)}
                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-all"
                                >
                                    Start Sprint
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 min-h-[50px]">
                        {sprintTickets.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 m-4 rounded-lg bg-slate-50/50">
                                Plan your sprint by dragging issues here.
                            </div>
                        ) : (
                            sprintTickets.map(renderTicketRow)
                        )}
                    </div>
                    <div className="p-2 bg-slate-50 border-t border-slate-100">
                        <button className="w-full text-left p-2 text-sm text-slate-500 hover:bg-slate-100 rounded flex items-center transition-colors">
                            <Plus size={14} className="mr-2" /> Create issue
                        </button>
                    </div>
                </div>
             )
        })}

        {/* Backlog */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5">
             <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <ChevronDown size={18} className="text-slate-400" />
                    <div>
                        <span className="font-bold text-slate-800 text-lg">Backlog</span>
                        <p className="text-xs text-slate-400 mt-0.5">{tickets.filter(t => !t.sprint_id).length} issues</p>
                    </div>
                </div>
            </div>
            <div className="divide-y divide-slate-100">
                {tickets.filter(t => !t.sprint_id).map(renderTicketRow)}
                {tickets.filter(t => !t.sprint_id).length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-sm">
                        Your backlog is empty.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};