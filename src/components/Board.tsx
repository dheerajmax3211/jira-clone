import React, { useState, useMemo } from 'react';
import { Ticket, TicketStatus, Profile, Board as BoardType, TicketType, TicketPriority } from '../types';
import { Search, List, LayoutGrid, Flag, Check, SlidersHorizontal, User, ChevronDown } from 'lucide-react';

interface BoardProps {
  tickets: Ticket[];
  allTickets: Ticket[];
  profiles: Profile[];
  activeBoard?: BoardType;
  onTicketClick: (ticket: Ticket) => void;
  onTicketMove: (id: string, newStatus: TicketStatus) => void;
  onTicketUpdate: (ticket: Partial<Ticket>) => void;
  sprintName: string;
}

export const Board: React.FC<BoardProps> = ({ tickets, allTickets, profiles, activeBoard, onTicketClick, onTicketMove, onTicketUpdate, sprintName }) => {
  const [filterText, setFilterText] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [quickFilter, setQuickFilter] = useState<'none' | 'my_issues' | 'recent'>('none');
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  
  // Advanced Filters State
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);

  // DYNAMIC COLUMN LOGIC
  const columns = useMemo(() => {
      if (activeBoard?.columns && activeBoard.columns.length > 0) {
          return activeBoard.columns.map(c => ({...c, color: 'bg-slate-50'}));
      }

      // Auto-discover columns from data
      const projectTickets = allTickets.filter(t => t.board_id === activeBoard?.id);
      const uniqueStatuses = Array.from(new Set(projectTickets.map(t => t.status)));
      
      // Default Fallback
      if (uniqueStatuses.length === 0) {
          return ['Todo', 'In Progress', 'Done'].map(s => ({
              id: s, title: s, limit: 0, color: 'bg-slate-50'
          }));
      }

      // Simple heuristic to sort columns logically if possible
      const startKeywords = ['todo', 'open', 'new', 'backlog', 'planning'];
      const endKeywords = ['done', 'closed', 'complete', 'released', 'shipped'];
      
      uniqueStatuses.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const aStart = startKeywords.some(k => aLower.includes(k));
          const bStart = startKeywords.some(k => bLower.includes(k));
          const aEnd = endKeywords.some(k => aLower.includes(k));
          const bEnd = endKeywords.some(k => bLower.includes(k));

          if (aStart && !bStart) return -1;
          if (!aStart && bStart) return 1;
          if (aEnd && !bEnd) return 1;
          if (!aEnd && bEnd) return -1;
          return 0;
      });

      return uniqueStatuses.map(status => ({
          id: status,
          title: status,
          limit: 0,
          color: 'bg-slate-50'
      }));
  }, [activeBoard, allTickets]);

  // Simple HTML5 Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData('ticketId', ticketId);
  };

  const handleDrop = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('ticketId');
    if (ticketId) {
      onTicketMove(ticketId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const getParentTitle = (parentId: string | null) => {
      if (!parentId) return null;
      const parent = allTickets.find(t => t.id === parentId);
      return parent ? parent.title : null;
  };

  const getTicketIcon = (type?: string) => {
      switch(type) {
          case 'Bug': return <div className="w-4 h-4 rounded-[3px] bg-red-500 flex items-center justify-center text-white shrink-0 pointer-events-none"><div className="w-1 h-1 rounded-full bg-white"/></div>;
          case 'Epic': return <div className="w-4 h-4 rounded-[3px] bg-purple-600 flex items-center justify-center text-white shrink-0 pointer-events-none"><div className="w-1.5 h-1.5 bg-white mask-star"/></div>;
          case 'Story': return <div className="w-4 h-4 rounded-[3px] bg-green-600 flex items-center justify-center text-white shrink-0 pointer-events-none"><div className="w-1.5 h-1.5 bg-white transform rotate-45"/></div>;
          default: return <div className="w-4 h-4 rounded-[3px] bg-blue-500 flex items-center justify-center text-white shrink-0 pointer-events-none"><Check size={10} strokeWidth={4} /></div>;
      }
  };

  // Combining all the filter logic here
  const filteredTickets = tickets.filter(t => {
      const matchesText = t.title.toLowerCase().includes(filterText.toLowerCase());
      const matchesAssignee = assigneeFilter === 'all' || t.assignee_id === assigneeFilter;
      
      // TODO: Implement actual 'my_issues' logic using auth context ID later
      let matchesQuick = true;
      if (quickFilter === 'my_issues') matchesQuick = t.assignee_id === 'me'; 

      const matchesType = typeFilters.length === 0 || typeFilters.includes(t.type);
      const matchesPriority = priorityFilters.length === 0 || priorityFilters.includes(t.priority);

      return matchesText && matchesAssignee && matchesQuick && matchesType && matchesPriority;
  });

  const toggleTypeFilter = (type: string) => {
      setTypeFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const togglePriorityFilter = (priority: string) => {
      setPriorityFilters(prev => prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Board Header & Filters (Sticky) */}
      <div className="px-8 py-5 border-b border-slate-200 flex flex-col gap-4 sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                {sprintName}
                <span className="ml-3 text-xs font-normal text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    {filteredTickets.length} issues
                </span>
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('kanban')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutGrid size={16} />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <List size={16} />
                </button>
            </div>
        </div>

        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="relative group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search board" 
                        className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-56 bg-slate-50 focus:bg-white transition-all"
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                    />
                </div>
                
                {/* Advanced Filter Toggle */}
                <div className="relative">
                    <button 
                        onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md font-medium border transition-colors ${isAdvancedFilterOpen || typeFilters.length > 0 || priorityFilters.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <SlidersHorizontal size={14} />
                        Filters
                        {(typeFilters.length > 0 || priorityFilters.length > 0) && (
                            <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">
                                {typeFilters.length + priorityFilters.length}
                            </span>
                        )}
                    </button>
                    
                    {isAdvancedFilterOpen && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-lg p-4 z-50 animate-in fade-in slide-in-from-top-1">
                             <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-slate-500 uppercase">Issue Type</span>
                                {typeFilters.length > 0 && <button onClick={() => setTypeFilters([])} className="text-[10px] text-blue-600 hover:underline">Clear</button>}
                             </div>
                             <div className="flex flex-wrap gap-2 mb-4">
                                {['Story', 'Task', 'Bug', 'Epic'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => toggleTypeFilter(t)}
                                        className={`text-xs px-2 py-1 rounded border transition-colors ${typeFilters.includes(t) ? 'bg-blue-100 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                             </div>

                             <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-slate-500 uppercase">Priority</span>
                                {priorityFilters.length > 0 && <button onClick={() => setPriorityFilters([])} className="text-[10px] text-blue-600 hover:underline">Clear</button>}
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                    <button 
                                        key={p}
                                        onClick={() => togglePriorityFilter(p)}
                                        className={`text-xs px-2 py-1 rounded border transition-colors ${priorityFilters.includes(p) ? 'bg-blue-100 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                <div className="flex items-center -space-x-2">
                    {profiles.slice(0, 5).map(p => (
                        <button 
                            key={p.id} 
                            onClick={() => setAssigneeFilter(assigneeFilter === p.id ? 'all' : p.id)}
                            className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold transition-transform hover:z-10 hover:scale-110 ${assigneeFilter === p.id ? 'ring-2 ring-offset-1 ring-blue-500 z-10' : ''} bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-sm`}
                            title={p.name}
                        >
                            {p.name.charAt(0)}
                        </button>
                    ))}
                    {assigneeFilter !== 'all' && (
                        <button 
                            onClick={() => setAssigneeFilter('all')}
                            className="ml-3 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-md"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      {/* Board Columns */}
      {viewMode === 'kanban' ? (
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 whitespace-nowrap bg-slate-50/50">
        <div className="flex space-x-6 h-full min-w-max">
            {columns.length > 0 ? (
                columns.map(col => {
                    const count = filteredTickets.filter(t => t.status === col.id).length;
                    const isOverLimit = col.limit && count > col.limit;

                    return (
                    <div 
                        key={col.id} 
                        className={`w-80 flex-shrink-0 flex flex-col rounded-xl bg-slate-100/70 max-h-full border border-transparent transition-colors ${isOverLimit ? 'bg-red-50 border-red-100' : ''}`}
                        onDrop={(e) => handleDrop(e, col.id)}
                        onDragOver={handleDragOver}
                    >
                        <div className="p-4 flex justify-between items-center sticky top-0">
                            <span className={`text-xs font-bold uppercase tracking-wider ${isOverLimit ? 'text-red-600' : 'text-slate-500'}`}>{col.title}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOverLimit ? 'bg-red-100 text-red-600' : 'bg-slate-200/50 text-slate-400'}`}>
                                {count}{col.limit ? `/${col.limit}` : ''}
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2.5 scrollbar-hide">
                            {filteredTickets
                                .filter(t => t.status === col.id)
                                .map(ticket => {
                                    const parentTitle = getParentTitle(ticket.parent_id);
                                    const assignee = profiles.find(p => p.id === ticket.assignee_id);
                                    return (
                                    <div 
                                        key={ticket.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                                        onClick={() => onTicketClick(ticket)}
                                        className={`bg-white p-3.5 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-all group active:cursor-grabbing relative overflow-hidden
                                            ${ticket.is_flagged ? 'bg-amber-50 border-amber-200' : 'border-slate-200/80 hover:border-blue-300'}`}
                                    >
                                        {/* Type Indicator Bar */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${ticket.type === 'Bug' ? 'bg-red-500' : ticket.type === 'Epic' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                        
                                        <div className="pl-2.5">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    {getTicketIcon(ticket.type)}
                                                    <span className="text-xs text-slate-500 font-medium hover:underline hover:text-blue-600">{ticket.id.slice(0,4).toUpperCase()}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    {ticket.is_flagged && <Flag size={12} className="text-amber-500 fill-current" />}
                                                </div>
                                            </div>
                                            
                                            <p className="text-sm text-slate-800 font-medium whitespace-normal leading-snug mb-3">{ticket.title}</p>
                                            
                                            <div className="flex justify-between items-center mt-auto">
                                                <div className="flex items-center space-x-2">
                                                    {parentTitle && (
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={`Parent: ${parentTitle}`}>
                                                            {parentTitle}
                                                        </span>
                                                    )}
                                                    {ticket.labels?.slice(0, 2).map(l => (
                                                        <div key={l} className="w-2 h-2 rounded-full bg-blue-400" title={`Label: ${l}`}></div>
                                                    ))}
                                                    {ticket.priority === 'High' || ticket.priority === 'Critical' ? (
                                                        <span className="text-red-500" title="High Priority">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V4"/><path d="m5 13 7-7 7 7"/></svg>
                                                        </span>
                                                    ) : null}
                                                    {ticket.story_points ? (
                                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200">{ticket.story_points}</span>
                                                    ) : null}
                                                </div>
                                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-600 ring-2 ring-transparent group-hover:ring-slate-100 transition-all">
                                                    {assignee ? assignee.name.charAt(0) : <User size={12} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    )
                                })}
                        </div>
                    </div>
                    )
                })
            ) : (
                <div className="w-full flex flex-col items-center justify-center text-slate-400">
                    <p className="text-lg font-semibold">No columns detected.</p>
                    <p className="text-sm">Create tickets to see them here, or add columns in Settings.</p>
                </div>
            )}
        </div>
      </div>
      ) : (
          <div className="flex-1 overflow-auto bg-white">
              <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                      <tr>
                          <th className="px-6 py-3 font-semibold">Key</th>
                          <th className="px-6 py-3 font-semibold w-1/3">Summary</th>
                          <th className="px-6 py-3 font-semibold">Assignee</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                          <th className="px-6 py-3 font-semibold">Priority</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredTickets.map(ticket => {
                          const assignee = profiles.find(p => p.id === ticket.assignee_id);
                          return (
                              <tr key={ticket.id} onClick={() => onTicketClick(ticket)} className="hover:bg-slate-50 cursor-pointer group">
                                  {/* Key & Type (Editable) */}
                                  <td className="px-6 py-3">
                                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                          <div className="relative group/type">
                                              <div className="flex items-center">
                                                  {getTicketIcon(ticket.type)}
                                              </div>
                                              <select 
                                                value={ticket.type}
                                                onChange={(e) => onTicketUpdate({...ticket, type: e.target.value as TicketType})}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                title="Change Type"
                                              >
                                                  {['Story', 'Task', 'Bug', 'Epic'].map(t => (
                                                      <option key={t} value={t}>{t}</option>
                                                  ))}
                                              </select>
                                          </div>
                                          <span className="font-mono text-xs text-slate-500 font-medium group-hover:text-blue-600">{ticket.id.slice(0,4).toUpperCase()}</span>
                                      </div>
                                  </td>
                                  
                                  {/* Summary (Opens Modal) */}
                                  <td className="px-6 py-3 font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                      {ticket.title}
                                  </td>
                                  
                                  {/* Assignee (Editable) */}
                                  <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="relative inline-block group/assignee">
                                          <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-200/50 transition-colors">
                                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${assignee ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                                  {assignee ? assignee.name.charAt(0) : <User size={12} />}
                                              </div>
                                              <span className={`text-xs ${!assignee && 'text-slate-400 italic'}`}>{assignee ? assignee.name : 'Unassigned'}</span>
                                              <ChevronDown size={12} className="text-slate-300 group-hover/assignee:text-slate-500" />
                                          </div>
                                          <select 
                                            value={ticket.assignee_id || ''}
                                            onChange={(e) => onTicketUpdate({...ticket, assignee_id: e.target.value || null})}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            title="Assign To"
                                          >
                                              <option value="">Unassigned</option>
                                              {profiles.map(p => (
                                                  <option key={p.id} value={p.id}>{p.name}</option>
                                              ))}
                                          </select>
                                      </div>
                                  </td>
                                  
                                  {/* Status (Editable) */}
                                  <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="relative inline-block">
                                          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer border border-transparent hover:border-slate-300">
                                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">{ticket.status}</span>
                                              <ChevronDown size={10} className="text-slate-400" />
                                          </div>
                                          <select 
                                            value={ticket.status}
                                            onChange={(e) => onTicketUpdate({...ticket, status: e.target.value})}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            title="Change Status"
                                          >
                                              {columns.map(c => (
                                                  <option key={c.id} value={c.id}>{c.title}</option>
                                              ))}
                                          </select>
                                      </div>
                                  </td>
                                  
                                  {/* Priority (Editable) */}
                                  <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="relative inline-block">
                                           <div className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 
                                              ${ticket.priority === 'Critical' ? 'text-red-600 bg-red-50' : 
                                                ticket.priority === 'High' ? 'text-orange-600' : 'text-slate-600'}`}>
                                              {ticket.priority === 'Critical' || ticket.priority === 'High' ? (
                                                 <Flag size={12} className="fill-current" /> 
                                              ) : null}
                                              <span className="text-xs font-medium">{ticket.priority}</span>
                                              <ChevronDown size={10} className="text-slate-300" />
                                          </div>
                                          <select 
                                            value={ticket.priority}
                                            onChange={(e) => onTicketUpdate({...ticket, priority: e.target.value as TicketPriority})}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            title="Change Priority"
                                          >
                                              {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                                  <option key={p} value={p}>{p}</option>
                                              ))}
                                          </select>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
}