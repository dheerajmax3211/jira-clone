import React, { useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { Backlog } from './components/Backlog';
import { TicketModal } from './components/TicketModal';
import { ImportModal } from './components/ImportModal';
import { SettingsView } from './components/SettingsView';
import { BoardModal } from './components/BoardModal';
import { Ticket, Sprint, TicketStatus, Profile, Board as BoardType, TicketHistory } from './types';
import { AlertCircle, LogOut, User, Search, Check } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'board' | 'backlog' | 'settings'>('board');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | undefined>(undefined);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Board Modal state
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardType | undefined>(undefined);

  // Profile Dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Global Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown & search on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured()) {
        // 1. Check active session
        supabase!.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) initData(session.user);
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                initData(session.user);
            } else {
                // Clear sensitive data on logout
                setTickets([]);
                setProfiles([]); 
                setBoards([]);
            }
        });

        // 3. Realtime subscription for team members (Profiles)
        const profileChannel = supabase!.channel('profiles-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => {
                    supabase!.from('profiles').select('*').then(({ data }) => {
                        if (data) setProfiles(data);
                    });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            profileChannel.unsubscribe();
        };
    } else {
        // Demo mode (no auth)
        fetchData();
    }
  }, []);

  const initData = async (user: any) => {
      if (user && isSupabaseConfigured()) {
          try {
              const { data } = await supabase!.from('profiles').select('id').eq('id', user.id).maybeSingle();
              if (!data) {
                  const newProfile = {
                      id: user.id,
                      email: user.email,
                      name: user.email?.split('@')[0] || 'User',
                      role: 'Member'
                  };
                  await supabase!.from('profiles').insert(newProfile);
              }
          } catch (e) {
              console.error("Profile check failed", e);
          }
      }
      fetchData();
  };

  const fetchData = async () => {
    if (!isSupabaseConfigured()) {
       const localData = localStorage.getItem('jira_clone_data');
       if (localData) {
           const parsed = JSON.parse(localData);
           setTickets(parsed.tickets || []);
           setSprints(parsed.sprints || []);
           setProfiles(parsed.profiles || []);
           // Ensure we load boards, but if missing (old data), fallback to default with explicit columns
           setBoards(parsed.boards || [{
               id: 'default', 
               name: 'Main Board', 
               key: 'MAIN', 
               type: 'kanban',
               columns: [
                 { id: 'Todo', title: 'To Do', limit: 0 },
                 { id: 'In Progress', title: 'In Progress', limit: 4 },
                 { id: 'Review', title: 'Review', limit: 3 },
                 { id: 'Done', title: 'Done', limit: 0 }
               ]
           }]);
           setActiveBoardId(parsed.activeBoardId || 'default');
       } else {
           const defaultBoardId = 'default-board';
           // Explicit columns for default board
           setBoards([{
               id: defaultBoardId, 
               name: 'Main Board', 
               key: 'MAIN', 
               type: 'kanban',
               columns: [
                 { id: 'Todo', title: 'To Do', limit: 0 },
                 { id: 'In Progress', title: 'In Progress', limit: 4 },
                 { id: 'Review', title: 'Review', limit: 3 },
                 { id: 'Done', title: 'Done', limit: 0 }
               ]
           }]);
           setActiveBoardId(defaultBoardId);
           setSprints([{ id: 'sp-1', name: 'Sprint 1', status: 'active', board_id: defaultBoardId }]);
           setProfiles([
               { id: 'demo-1', name: 'Demo User', email: 'demo@example.com', role: 'Admin' },
               { id: 'demo-2', name: 'Team Member', email: 'team@example.com', role: 'Member' }
           ]);
       }
       return;
    }

    setLoading(true);
    try {
      const { data: boardData, error: boardError } = await supabase!.from('boards').select('*');
      if (boardError) throw boardError;

      const { data: ticketData } = await supabase!.from('tickets').select('*');
      const { data: sprintData } = await supabase!.from('sprints').select('*').order('created_at', { ascending: false });
      const { data: profileData } = await supabase!.from('profiles').select('*');

      setTickets(ticketData || []);
      setSprints(sprintData || []);
      setProfiles(profileData || []);
      
      const loadedBoards = boardData || [];
      setBoards(loadedBoards);
      
      if (loadedBoards.length > 0 && !activeBoardId) {
          setActiveBoardId(loadedBoards[0].id);
      } else if (loadedBoards.length === 0) {
          const defaultBoard = { name: 'Main Board', key: 'MAIN', type: 'kanban' };
          const { data: newBoard } = await supabase!.from('boards').insert(defaultBoard).select().single();
          if (newBoard) {
              setBoards([newBoard]);
              setActiveBoardId(newBoard.id);
          }
      }
      setError(null);
    } catch (err: any) {
      console.error('Data fetch error:', err);
      
      // Specific handling for Schema Cache errors
      if (err.message?.includes('Could not find the table') || err.message?.includes('schema cache')) {
        setError(
          'Supabase Schema Cache stale. Please go to Supabase Dashboard > Project Settings > API > click "Reload schema cache" button.'
        );
      } else if (err.code !== 'PGRST116') {
        setError(err.message || 'Failed to load data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const syncData = async (
      newTickets: Ticket[], 
      newSprints: Sprint[], 
      newProfiles: Profile[],
      newBoards: BoardType[]
  ) => {
      setTickets(newTickets);
      setSprints(newSprints);
      setProfiles(newProfiles);
      setBoards(newBoards);
      
      if (!isSupabaseConfigured()) {
          localStorage.setItem('jira_clone_data', JSON.stringify({ 
              tickets: newTickets, 
              sprints: newSprints, 
              profiles: newProfiles, 
              boards: newBoards,
              activeBoardId 
          }));
      }
  };

  const handleSaveBoard = async (board: Partial<BoardType>) => {
      const newBoard = {
          ...board,
          id: board.id || crypto.randomUUID(),
      } as BoardType;

      let updatedBoards = [...boards];
      const exists = boards.find(b => b.id === newBoard.id);
      
      if (exists) {
          updatedBoards = boards.map(b => b.id === newBoard.id ? newBoard : b);
      } else {
          updatedBoards.push(newBoard);
      }

      setBoards(updatedBoards);
      if (!exists) setActiveBoardId(newBoard.id);
      
      if (isSupabaseConfigured()) {
          await supabase!.from('boards').upsert(newBoard);
      } else {
          syncData(tickets, sprints, profiles, updatedBoards);
      }
  };

  const handleDeleteBoard = async () => {
      if (!activeBoardId) return;
      
      const updatedBoards = boards.filter(b => b.id !== activeBoardId);
      setBoards(updatedBoards);
      
      if (updatedBoards.length > 0) {
          setActiveBoardId(updatedBoards[0].id);
      } else {
          setActiveBoardId('');
      }

      if (isSupabaseConfigured()) {
          await supabase!.from('boards').delete().eq('id', activeBoardId);
      } else {
          syncData(tickets, sprints, profiles, updatedBoards);
      }
  };

  const handleAddMember = async (name: string, email: string) => {
      const newProfile: Profile = {
          id: crypto.randomUUID(),
          name,
          email,
          role: 'Member'
      };
      
      const updatedProfiles = [...profiles, newProfile];
      setProfiles(updatedProfiles);
      
      if (isSupabaseConfigured()) {
          const { error } = await supabase!.from('profiles').insert(newProfile);
          if (error) {
              console.error("Failed to add member:", error);
              // Handle RLS errors
              if (error.code === '42501') {
                 alert("Permission denied. Run the RLS Policy script in README.md to fix database permissions.");
              }
          }
      } else {
          syncData(tickets, sprints, updatedProfiles, boards);
      }
  };

  const logTicketHistory = async (oldTicket: Ticket | undefined, newTicket: Ticket) => {
      const changes: Partial<TicketHistory>[] = [];
      const user = session?.user;
      const profile = profiles.find(p => p.id === user?.id);
      const userName = profile?.name || 'Unknown';
      
      if (!oldTicket) {
           changes.push({ field: 'status', old_value: null, new_value: newTicket.status });
      } else {
          // Check standard fields
          const fields: (keyof Ticket)[] = ['status', 'priority', 'assignee_id', 'story_points', 'time_estimate', 'time_spent'];
          fields.forEach(field => {
              if (oldTicket[field] !== newTicket[field]) {
                   let oldVal = String(oldTicket[field] || '');
                   let newVal = String(newTicket[field] || '');
                   if (field === 'assignee_id') {
                       oldVal = profiles.find(p => p.id === oldTicket[field])?.name || 'Unassigned';
                       newVal = profiles.find(p => p.id === newTicket[field])?.name || 'Unassigned';
                   }
                   changes.push({ field: field as string, old_value: oldVal, new_value: newVal });
              }
          });
      }

      if (changes.length > 0) {
          const historyPayload = changes.map(c => ({
              id: crypto.randomUUID(),
              ticket_id: newTicket.id,
              user_id: user?.id,
              user_name: userName,
              field: c.field,
              old_value: c.old_value,
              new_value: c.new_value,
              created_at: new Date().toISOString()
          }));

          if (isSupabaseConfigured()) {
               await supabase!.from('ticket_history').insert(historyPayload);
          } else {
               // Local History Fallback
               const currentHistory = JSON.parse(localStorage.getItem('jira_clone_history') || '[]');
               localStorage.setItem('jira_clone_history', JSON.stringify([...currentHistory, ...historyPayload]));
          }
      }
  };

  const handleCreateOrUpdateTicket = async (ticketData: Partial<Ticket>) => {
    const oldTicket = tickets.find(t => t.id === ticketData.id);

    const newTicket = {
        ...ticketData,
        id: ticketData.id || crypto.randomUUID(),
        board_id: ticketData.board_id || activeBoardId,
        created_at: ticketData.created_at || new Date().toISOString()
    } as Ticket;

    await logTicketHistory(oldTicket, newTicket);

    const isUpdate = !!oldTicket;
    const updatedTickets = isUpdate 
        ? tickets.map(t => t.id === newTicket.id ? newTicket : t)
        : [...tickets, newTicket];
    
    syncData(updatedTickets, sprints, profiles, boards);

    if (isSupabaseConfigured()) {
        const { error } = await supabase!.from('tickets').upsert(newTicket);
        if (error) console.error("Failed to save ticket:", error);
    }
  };

  const handleDeleteTicket = async (id: string) => {
      const updatedTickets = tickets.filter(t => t.id !== id);
      syncData(updatedTickets, sprints, profiles, boards);
      if (isSupabaseConfigured()) await supabase!.from('tickets').delete().eq('id', id);
      setIsTicketModalOpen(false);
  }

  const handleMoveTicket = async (id: string, newStatus: TicketStatus) => {
      const ticket = tickets.find(t => t.id === id);
      if (!ticket) return;
      handleCreateOrUpdateTicket({ ...ticket, status: newStatus });
  };

  const handleCreateSprint = async () => {
      const newSprint: Sprint = {
          id: crypto.randomUUID(),
          board_id: activeBoardId,
          name: `Sprint ${sprints.filter(s => s.board_id === activeBoardId).length + 1}`,
          status: 'future'
      };
      const updatedSprints = [newSprint, ...sprints];
      syncData(tickets, updatedSprints, profiles, boards);
      if (isSupabaseConfigured()) await supabase!.from('sprints').insert(newSprint);
  };

  const handleUpdateSprint = async (sprint: Sprint) => {
      const updatedSprints = sprints.map(s => s.id === sprint.id ? sprint : s);
      syncData(tickets, updatedSprints, profiles, boards);
      if (isSupabaseConfigured()) await supabase!.from('sprints').upsert(sprint);
  };
  
  // Handles the bulk import from the modal
  const handleBulkImport = async (importData: { boards: BoardType[], sprints: Sprint[], tickets: Ticket[] }) => {
      const mergedBoards = [...boards, ...importData.boards];
      const mergedSprints = [...sprints, ...importData.sprints];
      const mergedTickets = [...tickets, ...importData.tickets];
      
      // Update local state immediately for responsiveness
      syncData(mergedTickets, mergedSprints, profiles, mergedBoards);
      
      // If we imported new boards, switch to the first one
      if (importData.boards.length > 0) {
          setActiveBoardId(importData.boards[0].id);
      }

      // If Supabase is connected, do bulk inserts
      if (isSupabaseConfigured()) {
          if (importData.boards.length > 0) await supabase!.from('boards').insert(importData.boards);
          if (importData.sprints.length > 0) await supabase!.from('sprints').insert(importData.sprints);
          if (importData.tickets.length > 0) await supabase!.from('tickets').insert(importData.tickets);
      }
  };

  const handleLogout = async () => {
      await supabase!.auth.signOut();
      setSession(null);
  }

  // Force board view if Kanban (since Backlog view is disabled)
  useEffect(() => {
    const active = boards.find(b => b.id === activeBoardId);
    if (active && active.type === 'kanban' && view === 'backlog') {
        setView('board');
    }
  }, [activeBoardId, boards, view]);

  if (isSupabaseConfigured() && !session) return <Auth />;

  const activeSprint = sprints.find(s => s.status === 'active' && s.board_id === activeBoardId);
  const activeBoard = boards.find(b => b.id === activeBoardId);
  const projectTickets = tickets.filter(t => t.board_id === activeBoardId || (!t.board_id && activeBoardId));
  const projectSprints = sprints.filter(s => s.board_id === activeBoardId || (!s.board_id && activeBoardId));
  
  // LOGIC CHANGE: Kanban shows all project tickets. Scrum shows only Active Sprint tickets.
  const boardTickets = activeBoard?.type === 'kanban'
      ? projectTickets
      : projectTickets.filter(t => t.sprint_id === activeSprint?.id);

  const currentUserProfile = session ? profiles.find(p => p.id === session.user.id) : null;
  const userInitials = currentUserProfile 
        ? currentUserProfile.name.charAt(0).toUpperCase() 
        : (session?.user?.email?.substring(0, 2).toUpperCase() || 'G');

  // Global Search Logic
  const searchResults = searchQuery.trim() 
    ? tickets.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.id.includes(searchQuery.toLowerCase())
      ).slice(0, 5) // Limit to 5 results
    : [];

  const boardHeaderTitle = activeBoard?.type === 'kanban' 
      ? (activeBoard.name || 'Kanban Board') 
      : (activeSprint?.name || 'Backlog');

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-slate-900">
      <Sidebar 
        currentView={view} 
        setView={setView} 
        onOpenImport={() => setIsImportModalOpen(true)}
        boards={boards}
        activeBoardId={activeBoardId}
        onChangeBoard={setActiveBoardId}
        onCreateBoard={() => {
            setEditingBoard(undefined);
            setIsBoardModalOpen(true);
        }}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Bar with very high z-index (z-[100]) to overlay board headers */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-[100] shadow-sm relative">
            <div className="flex items-center text-sm breadcrumbs text-slate-500 gap-4">
                 {/* Search Input */}
                 <div className="relative" ref={searchRef}>
                    <div className="relative group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={16} />
                        <input 
                            className="bg-gray-100 hover:bg-gray-200 focus:bg-white border border-transparent focus:border-blue-500 rounded-md pl-9 pr-4 py-1.5 text-sm w-48 focus:w-72 transition-all outline-none"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                        />
                    </div>
                    {/* Search Results Dropdown */}
                    {isSearchOpen && searchQuery.trim() && (
                        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                             <div className="px-3 py-2 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">
                                 Global Search Results
                             </div>
                             {searchResults.length > 0 ? (
                                 <div>
                                     {searchResults.map(result => (
                                         <button 
                                            key={result.id}
                                            onClick={() => {
                                                setSelectedTicket(result);
                                                setIsTicketModalOpen(true);
                                                setIsSearchOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-none group"
                                         >
                                             <div className="flex items-center justify-between mb-1">
                                                 <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600">{result.id.slice(0,4).toUpperCase()}</span>
                                                 <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 uppercase">{result.status}</span>
                                             </div>
                                             <div className="text-sm font-medium text-gray-800 truncate">{result.title}</div>
                                             <div className="text-[10px] text-gray-400 mt-1">
                                                 {boards.find(b => b.id === result.board_id)?.name || 'Unknown Project'}
                                             </div>
                                         </button>
                                     ))}
                                 </div>
                             ) : (
                                 <div className="p-4 text-center text-sm text-gray-400">No issues found.</div>
                             )}
                        </div>
                    )}
                 </div>

                <div className="h-4 w-px bg-gray-200"></div>

                <div className="flex items-center text-slate-500">
                    <span className="font-semibold text-slate-700">Projects</span>
                    <span className="mx-2">/</span>
                    <span>{activeBoard?.name || 'Loading...'}</span>
                    {view === 'board' && <><span className="mx-2">/</span><span>{boardHeaderTitle}</span></>}
                </div>
            </div>
            <div className="flex items-center space-x-4">
                <button 
                    onClick={() => { setSelectedTicket(undefined); setIsTicketModalOpen(true); }}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition shadow-sm hover:shadow-md active:transform active:scale-95"
                >
                    Create Issue
                </button>
                
                <div className="relative" ref={profileRef}>
                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded-full transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs border border-white shadow-sm ring-2 ring-indigo-50">
                            {userInitials}
                        </div>
                    </button>
                    {isProfileOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
                            <div className="px-4 py-3 border-b border-slate-100">
                                <p className="text-sm font-bold text-slate-800">{currentUserProfile?.name || 'Guest User'}</p>
                                <p className="text-xs text-slate-500 truncate">{session?.user?.email || 'Demo Mode'}</p>
                            </div>
                            <div className="py-1">
                                <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center">
                                    <User size={16} className="mr-2" /> Profile
                                </button>
                                {isSupabaseConfigured() && (
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                                        <LogOut size={16} className="mr-2" /> Log out
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative bg-white">
            {error && (
                <div className="absolute top-4 left-4 right-4 z-50 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center shadow-md animate-in slide-in-from-top-2">
                    <AlertCircle className="mr-2" size={20} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-sm font-bold hover:underline">Dismiss</button>
                </div>
            )}

            {view === 'board' && (
                <Board 
                    tickets={boardTickets} 
                    allTickets={tickets}
                    profiles={profiles}
                    activeBoard={activeBoard}
                    onTicketClick={(t) => { setSelectedTicket(t); setIsTicketModalOpen(true); }}
                    onTicketMove={handleMoveTicket}
                    onTicketUpdate={handleCreateOrUpdateTicket}
                    sprintName={boardHeaderTitle}
                />
            )}
            {view === 'backlog' && activeBoard?.type === 'scrum' && (
                <Backlog 
                    tickets={projectTickets} 
                    sprints={projectSprints}
                    onTicketClick={(t) => { setSelectedTicket(t); setIsTicketModalOpen(true); }}
                    onCreateSprint={handleCreateSprint}
                    onUpdateSprint={handleUpdateSprint}
                />
            )}
            {view === 'settings' && (
                <SettingsView 
                    profiles={profiles}
                    activeBoard={activeBoard}
                    onEditBoard={() => {
                        setEditingBoard(activeBoard);
                        setIsBoardModalOpen(true);
                    }}
                    onDeleteBoard={handleDeleteBoard}
                    onAddMember={handleAddMember}
                />
            )}
        </div>
      </main>

      <TicketModal 
        isOpen={isTicketModalOpen} 
        onClose={() => setIsTicketModalOpen(false)}
        ticket={selectedTicket}
        allTickets={tickets}
        sprints={projectSprints}
        profiles={profiles}
        activeBoard={activeBoard}
        onSave={handleCreateOrUpdateTicket}
        onDelete={handleDeleteTicket}
        onTicketSelect={(ticket) => setSelectedTicket(ticket)}
      />
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        activeBoardId={activeBoardId}
        onImport={handleBulkImport}
      />
      <BoardModal 
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        onSave={handleSaveBoard}
        editingBoard={editingBoard}
      />
    </div>
  );
}