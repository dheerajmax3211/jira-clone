import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Link as LinkIcon, Plus, User, Check, Flag, Copy, Type, List, CheckSquare, Search, Bold, Italic, Code, Heading1, Heading2, Quote, ChevronDown, MessageSquare, Loader2, Eye, Edit3, Clock, History, BarChart2, Paperclip, File, Download, Image as ImageIcon, CornerDownRight } from 'lucide-react';
import { Ticket, Sprint, TicketStatus, TicketPriority, Comment, Profile, Subtask, TicketType, TicketHistory, Board, Attachment } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket?: Ticket;
  allTickets: Ticket[];
  sprints: Sprint[];
  profiles: Profile[];
  activeBoard?: Board;
  onSave: (ticket: Partial<Ticket>) => Promise<void>;
  onDelete?: (id: string) => void;
  onTicketSelect: (ticket: Ticket) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, ticket, allTickets, sprints, profiles, activeBoard, onSave, onDelete, onTicketSelect }) => {
  const [formData, setFormData] = useState<Partial<Ticket>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Controls whether we are writing markdown or previewing the result
  const [descriptionMode, setDescriptionMode] = useState<'write' | 'preview'>('write');
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableStatuses = activeBoard?.columns?.map(c => c.id) || ['Todo', 'In Progress', 'Testing', 'Done'];

  // Initialize or Reset Modal State
  useEffect(() => {
    if (ticket) {
      setFormData(ticket);
      fetchComments(ticket.id);
      fetchHistory(ticket.id);
      fetchAttachments(ticket.id);
    } else {
      setFormData({
        title: '',
        description: '',
        status: availableStatuses[0],
        type: 'Story',
        priority: 'Medium',
        story_points: 0,
        time_estimate: 0,
        time_spent: 0,
        sprint_id: sprints.find(s => s.status === 'active')?.id || null,
        parent_id: null,
        assignee_id: null,
        labels: [],
        subtasks: [],
        is_flagged: false,
        linked_tickets: []
      });
      setComments([]);
      setHistory([]);
      setAttachments([]);
      setDescriptionMode('write');
    }
    setActiveTab('comments');
  }, [ticket, sprints, isOpen, activeBoard]);

  // Handle outside clicks for the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchComments = async (ticketId: string) => {
    if (!isSupabaseConfigured()) { 
        // Local storage fallback
        const savedComments = JSON.parse(localStorage.getItem('jira_clone_comments') || '[]');
        const ticketComments = savedComments.filter((c: Comment) => c.ticket_id === ticketId);
        // Sort descending (newest first)
        setComments(ticketComments.sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        return; 
    }
    const { data } = await supabase!.from('comments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false });
    setComments(data || []);
  };

  const fetchHistory = async (ticketId: string) => {
    if (!isSupabaseConfigured()) { 
        // Local storage fallback
        const savedHistory = JSON.parse(localStorage.getItem('jira_clone_history') || '[]');
        const ticketHistory = savedHistory.filter((h: TicketHistory) => h.ticket_id === ticketId);
        setHistory(ticketHistory.sort((a: TicketHistory, b: TicketHistory) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        return; 
    }
    const { data } = await supabase!.from('ticket_history').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false });
    setHistory(data || []);
  };

  const fetchAttachments = async (ticketId: string) => {
    if (!isSupabaseConfigured()) { setAttachments([]); return; }
    const { data } = await supabase!.from('attachments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false });
    setAttachments(data || []);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !ticket) return;
    const commentPayload = {
        id: crypto.randomUUID(),
        ticket_id: ticket.id,
        content: newComment,
        user_name: 'Me', 
        created_at: new Date().toISOString()
    };
    
    if (isSupabaseConfigured()) {
        await supabase!.from('comments').insert(commentPayload);
    } else {
        const savedComments = JSON.parse(localStorage.getItem('jira_clone_comments') || '[]');
        localStorage.setItem('jira_clone_comments', JSON.stringify([...savedComments, commentPayload]));
    }
    
    setComments([commentPayload, ...comments]);
    setNewComment('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !ticket || !isSupabaseConfigured()) return;
      
      setIsUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          // Avoid filename collisions by prefixing ID
          const fileName = `${ticket.id}/${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${fileName}`;

          // Note: RLS Policies must be enabled on the bucket for this to work
          const { error: uploadError } = await supabase!.storage
              .from('attachments')
              .upload(filePath, file);
          
          if (uploadError) throw uploadError;

          const { data: userData } = await supabase!.auth.getUser();
          const attachmentPayload = {
              ticket_id: ticket.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
              uploader_id: userData.user?.id,
              created_at: new Date().toISOString()
          };

          const { data, error: dbError } = await supabase!.from('attachments').insert(attachmentPayload).select().single();
          if (dbError) throw dbError;

          if (data) setAttachments([data, ...attachments]);

      } catch (err: any) {
          console.error("Upload failed", err);
          alert(`Upload failed: ${err.message || 'Unknown error'}. Check if your Supabase Storage Bucket Policies are configured to allow uploads.`);
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
      if (!confirm('Delete this file?')) return;
      if (!isSupabaseConfigured()) return;

      try {
          // Remove from bucket
          await supabase!.storage.from('attachments').remove([attachment.file_path]);
          // Remove metadata from DB
          await supabase!.from('attachments').delete().eq('id', attachment.id);
          
          setAttachments(attachments.filter(a => a.id !== attachment.id));
      } catch (err) {
          console.error("Delete failed", err);
      }
  };

  const getPublicUrl = (path: string) => {
      if (!isSupabaseConfigured()) return '';
      const { data } = supabase!.storage.from('attachments').getPublicUrl(path);
      return data.publicUrl;
  };

  const handleSave = async () => {
      if (!formData.title) return;
      setIsSaving(true);
      try {
          await onSave(formData);
          onClose();
      } catch (e) {
          console.error("Error saving ticket", e);
      } finally {
          setIsSaving(false);
      }
  };

  const addLabel = () => {
      if (newLabel.trim()) {
          const currentLabels = formData.labels || [];
          if (!currentLabels.includes(newLabel.trim())) {
              setFormData({...formData, labels: [...currentLabels, newLabel.trim()]});
          }
          setNewLabel('');
          setIsAddingLabel(false);
      }
  };

  const toggleSubtask = (id: string) => {
      const updated = formData.subtasks?.map(t => t.id === id ? { ...t, completed: !t.completed } : t) || [];
      setFormData({ ...formData, subtasks: updated });
  };

  const addSubtask = (title: string) => {
      if (!title.trim()) return;
      const newSubtask: Subtask = { id: crypto.randomUUID(), title, completed: false };
      setFormData({ ...formData, subtasks: [...(formData.subtasks || []), newSubtask] });
  };

  const linkTicket = (targetId: string, relation: 'blocks' | 'is_blocked_by' | 'relates_to') => {
      const newLink = { id: targetId, relation };
      if (formData.linked_tickets?.find(l => l.id === targetId)) return;
      setFormData({ ...formData, linked_tickets: [...(formData.linked_tickets || []), newLink] });
      setIsLinkOpen(false);
  };

  // Helper for Markdown editor buttons
  const insertFormat = (before: string, after: string = '') => {
      if (descriptionMode !== 'write') setDescriptionMode('write');
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const selectedText = text.substring(start, end);
      
      const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
      
      setFormData({ ...formData, description: newText });
      
      // Reset cursor to logical position
      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + before.length, end + before.length);
      }, 0);
  };

  const formatMinutes = (mins?: number) => {
      if (!mins) return '0m';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getTicketIcon = (type?: string, sizeClass: string = "w-5 h-5", iconSize: number = 12) => {
      switch(type) {
          case 'Bug': return <div className={`${sizeClass} rounded-[4px] bg-red-500 flex items-center justify-center text-white shadow-sm`}><div className="w-1.5 h-1.5 rounded-full bg-white"/></div>;
          case 'Epic': return <div className={`${sizeClass} rounded-[4px] bg-purple-600 flex items-center justify-center text-white shadow-sm`}><div className="w-2 h-2 bg-white mask-star"/></div>;
          case 'Story': return <div className={`${sizeClass} rounded-[4px] bg-green-600 flex items-center justify-center text-white shadow-sm`}><div className="w-2 h-2 bg-white transform rotate-45"/></div>;
          default: return <div className={`${sizeClass} rounded-[4px] bg-blue-500 flex items-center justify-center text-white shadow-sm`}><Check size={iconSize} strokeWidth={4} /></div>;
      }
  };

  if (!isOpen) return null;

  const assigneeProfile = profiles.find(p => p.id === formData.assignee_id);
  const childTickets = ticket ? allTickets.filter(t => t.parent_id === ticket.id) : [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-[1200px] rounded-xl shadow-2xl flex flex-col ring-1 ring-slate-200 min-h-[600px] max-h-[92vh] relative font-sans">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0 rounded-t-xl sticky top-0 z-30">
            <div className="flex items-center space-x-3">
                 <div className="relative" ref={typeDropdownRef}>
                     <button 
                        onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                        className="flex items-center space-x-2 text-sm text-gray-700 font-semibold hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                     >
                        {getTicketIcon(formData.type)}
                        <span>{ticket ? `${ticket.id.slice(0,4).toUpperCase()}-${ticket.id.slice(9,13).toUpperCase()}` : 'New Issue'}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                     </button>

                     {isTypeDropdownOpen && (
                         <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-lg py-1 z-50 animate-in fade-in slide-in-from-top-1">
                             {(['Story', 'Task', 'Bug', 'Epic'] as TicketType[]).map(type => (
                                 <button
                                    key={type}
                                    onClick={() => { setFormData({...formData, type}); setIsTypeDropdownOpen(false); }}
                                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                                 >
                                     <div className="mr-3">{getTicketIcon(type)}</div>
                                     {type}
                                 </button>
                             ))}
                         </div>
                     )}
                 </div>
            </div>

            <div className="flex items-center space-x-2 text-gray-500">
                <button 
                    title="Copy Link"
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
                >
                    <Copy size={18} />
                </button>
                <div className="w-px h-5 bg-gray-200 mx-2"></div>
                {ticket && onDelete && (
                    <button onClick={() => onDelete(ticket.id)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Delete Issue">
                        <Trash2 size={18} />
                    </button>
                )}
                <button onClick={onClose} className="p-2 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors" title="Close">
                    <X size={22} />
                </button>
            </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col lg:flex-row min-h-full">
                
                {/* Left: Main Content */}
                <div className="flex-1 p-8 lg:p-10 lg:pr-16">
                    <input 
                        className="w-full text-3xl font-bold text-gray-900 placeholder:text-gray-300 border-none focus:ring-0 p-0 mb-8 bg-transparent leading-tight tracking-tight"
                        placeholder="Issue Summary"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        autoFocus={!ticket}
                    />

                    {/* Description Section */}
                    <div className="mb-10 group">
                        <div className="flex justify-between items-end mb-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Description</label>
                            <div className="flex bg-gray-100 rounded-lg p-0.5">
                                <button 
                                    onClick={() => setDescriptionMode('write')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${descriptionMode === 'write' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Edit3 size={12} /> Write
                                </button>
                                <button 
                                    onClick={() => setDescriptionMode('preview')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${descriptionMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Eye size={12} /> Preview
                                </button>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-sm bg-white">
                             {descriptionMode === 'write' && (
                                <div className="bg-gray-50 border-b border-gray-200 px-2 py-1.5 flex flex-wrap gap-1">
                                    <button onClick={() => insertFormat('**', '**')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Bold"><Bold size={16} /></button>
                                    <button onClick={() => insertFormat('*', '*')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Italic"><Italic size={16} /></button>
                                    <div className="w-px h-5 bg-gray-300 my-auto mx-1"></div>
                                    <button onClick={() => insertFormat('# ')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Heading 1"><Heading1 size={16} /></button>
                                    <button onClick={() => insertFormat('## ')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Heading 2"><Heading2 size={16} /></button>
                                    <button onClick={() => insertFormat('> ')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Quote"><Quote size={16} /></button>
                                    <button onClick={() => insertFormat('```\n', '\n```')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Code Block"><Code size={16} /></button>
                                    <div className="w-px h-5 bg-gray-300 my-auto mx-1"></div>
                                    <button onClick={() => insertFormat('- ')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Bulleted List"><List size={16} /></button>
                                    <button onClick={() => insertFormat('[', '](url)')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Link"><LinkIcon size={16} /></button>
                                </div>
                             )}
                            
                            {descriptionMode === 'write' ? (
                                <textarea 
                                    ref={textareaRef}
                                    className="w-full min-h-[200px] p-4 text-sm text-gray-800 border-none focus:ring-0 resize-y bg-white placeholder:text-gray-400 leading-relaxed font-mono"
                                    placeholder="Add a detailed description..."
                                    value={formData.description || ''}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            ) : (
                                <div className="w-full min-h-[200px] p-6 text-sm text-gray-800 bg-white prose prose-sm max-w-none markdown-body">
                                    {formData.description ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.description}</ReactMarkdown>
                                    ) : (
                                        <p className="text-gray-400 italic">No description provided.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Child Tickets (Hierarchy) Section */}
                    {childTickets.length > 0 && (
                        <div className="mb-10">
                             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                                 <CornerDownRight size={14} className="mr-1" />
                                 Child Issues ({childTickets.length})
                             </h3>
                             <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                 {childTickets.map(child => {
                                     const childAssignee = profiles.find(p => p.id === child.assignee_id);
                                     return (
                                         <div 
                                            key={child.id} 
                                            onClick={() => onTicketSelect(child)}
                                            className="flex items-center p-3 hover:bg-slate-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors group"
                                         >
                                             <div className="mr-3 shrink-0">{getTicketIcon(child.type)}</div>
                                             
                                             <div className="flex-1 min-w-0 mr-4">
                                                 <div className="flex items-center gap-2">
                                                     <span className="font-mono text-xs text-gray-500 group-hover:text-blue-600 font-bold w-12 shrink-0">{child.id.slice(0,4).toUpperCase()}</span>
                                                     <span className="text-sm font-medium text-gray-700 truncate">{child.title}</span>
                                                 </div>
                                             </div>
                                             
                                             <div className="flex items-center shrink-0">
                                                 {/* Story Points - Fixed Width Container */}
                                                 <div className="w-8 flex justify-center mr-2">
                                                     {child.story_points ? (
                                                         <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold text-xs min-w-[20px] text-center">{child.story_points}</span>
                                                     ) : (
                                                         <span className="text-gray-300 text-[10px]">-</span>
                                                     )}
                                                 </div>

                                                 {/* Status - Fixed Width Container */}
                                                 <div className="w-24 flex justify-end mr-3">
                                                      <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] truncate max-w-full text-center ${child.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                          {child.status}
                                                      </span>
                                                 </div>

                                                 {/* Assignee */}
                                                 <div className="w-6 flex justify-center">
                                                      {childAssignee && (
                                                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]" title={childAssignee.name}>
                                                              {childAssignee.name.charAt(0)}
                                                          </div>
                                                      )}
                                                 </div>
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                        </div>
                    )}
                    
                    {/* Attachments Section */}
                    <div className="mb-10">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Paperclip size={14} /> Attachments
                            </label>
                            {ticket && isSupabaseConfigured() && (
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden" 
                                        id="file-upload"
                                    />
                                    <label 
                                        htmlFor="file-upload"
                                        className={`cursor-pointer flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-xs font-bold transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        {isUploading ? <Loader2 size={12} className="animate-spin mr-2" /> : <Plus size={12} className="mr-1.5" />}
                                        {isUploading ? 'Uploading...' : 'Add File'}
                                    </label>
                                </div>
                            )}
                        </div>

                        {ticket && isSupabaseConfigured() ? (
                            <div className="space-y-2">
                                {attachments.length === 0 && (
                                    <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
                                        <p className="text-sm text-gray-400">No attachments yet.</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {attachments.map(att => (
                                        <div key={att.id} className="flex items-center p-3 border border-gray-200 rounded-lg bg-white hover:border-blue-300 transition-all shadow-sm group relative">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 shrink-0 text-gray-500">
                                                {att.file_type?.startsWith('image/') ? <ImageIcon size={20} /> : <File size={20} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-700 truncate" title={att.file_name}>{att.file_name}</div>
                                                <div className="text-[10px] text-gray-400">{(att.file_size / 1024).toFixed(1)} KB • {new Date(att.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-white px-1 shadow-sm rounded border border-gray-100">
                                                <a 
                                                    href={getPublicUrl(att.file_path)} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Download"
                                                >
                                                    <Download size={14} />
                                                </a>
                                                <button 
                                                    onClick={() => handleDeleteAttachment(att)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                                {ticket && isSupabaseConfigured() ? "No attachments yet." : "Connect Supabase to enable attachments."}
                            </div>
                        )}
                    </div>

                    {/* Tabs for Comments / History */}
                    <div className="mt-12 pt-0">
                        <div className="flex gap-6 border-b border-gray-100 mb-6">
                            <button 
                                onClick={() => setActiveTab('comments')}
                                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'comments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <MessageSquare size={16} /> Comments <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs text-gray-600">{comments.length}</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('history')}
                                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <History size={16} /> History
                            </button>
                        </div>

                        {activeTab === 'comments' ? (
                            <>
                                <div className="flex gap-4 mb-8">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs shrink-0 border border-gray-300">ME</div>
                                    <div className="flex-1">
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                                            <textarea 
                                                className="w-full p-3 text-sm border-none focus:ring-0 min-h-[50px] resize-y placeholder:text-gray-400 bg-white text-gray-800"
                                                placeholder="Add a comment..."
                                                value={newComment}
                                                onChange={e => setNewComment(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && e.ctrlKey) handlePostComment();
                                                }}
                                            />
                                            {newComment && (
                                                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
                                                    <button onClick={() => setNewComment('')} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Cancel</button>
                                                    <button onClick={handlePostComment} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm">Save</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="flex gap-4 group">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs shrink-0 border border-gray-200">{comment.user_name[0]}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="text-sm font-semibold text-gray-900">{comment.user_name}</span>
                                                    <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                                                </div>
                                                <div className="text-sm text-gray-700 leading-relaxed">{comment.content}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                {history.length === 0 && <p className="text-sm text-gray-400 italic">No history recorded.</p>}
                                {history.map(item => (
                                    <div key={item.id} className="flex gap-3 text-sm text-gray-600">
                                        <div className="w-8 flex justify-center pt-1"><div className="w-2 h-2 rounded-full bg-gray-300"></div></div>
                                        <div className="flex-1 pb-4 border-b border-gray-50">
                                            <span className="font-semibold text-gray-800">{item.user_name}</span> changed 
                                            <span className="font-mono text-xs font-bold mx-1 bg-gray-100 px-1 rounded uppercase">{item.field}</span>
                                            {item.old_value && <>from <span className="font-medium text-gray-800">{item.old_value}</span></>}
                                            {' '}to <span className="font-medium text-gray-800">{item.new_value}</span>
                                            <div className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Sidebar Metadata */}
                <div className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-gray-100 bg-gray-50 p-8 shrink-0 z-10">
                    <div className="space-y-8">
                        
                        {/* Status */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Status</label>
                            <div className="relative">
                                <select 
                                    className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none transition-all uppercase"
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value as TicketStatus})}
                                >
                                    {availableStatuses.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Details Panel */}
                        <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden p-5 space-y-6">
                             {/* Flag Impediment */}
                             <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                                <label className="text-xs font-semibold text-gray-500">Impediment</label>
                                <button 
                                    onClick={() => setFormData({...formData, is_flagged: !formData.is_flagged})}
                                    className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                        formData.is_flagged 
                                            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    <Flag size={12} className={`mr-1.5 ${formData.is_flagged ? 'fill-current' : ''}`} />
                                    {formData.is_flagged ? 'Flagged' : 'Flag Issue'}
                                </button>
                             </div>

                             {/* Parent Epic (Only for non-Epics) */}
                             {formData.type !== 'Epic' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 block">Parent Epic</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-gray-50 hover:bg-white border border-gray-200 text-sm font-medium rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none transition-colors truncate pr-8"
                                            value={formData.parent_id || ''}
                                            onChange={e => setFormData({...formData, parent_id: e.target.value || null})}
                                        >
                                            <option value="">No Parent</option>
                                            {allTickets
                                                .filter(t => t.type === 'Epic' && t.id !== formData.id && t.board_id === (formData.board_id || activeBoard?.id))
                                                .map(epic => (
                                                <option key={epic.id} value={epic.id}>
                                                    {epic.id.slice(0,4).toUpperCase()} - {epic.title}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="text-gray-400 absolute right-3 top-3 pointer-events-none" />
                                    </div>
                                </div>
                             )}

                             {/* Sprint (only for Scrum boards) */}
                             {activeBoard?.type === 'scrum' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 block">Sprint</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-gray-50 hover:bg-white border border-gray-200 text-sm font-medium rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none transition-colors truncate pr-8"
                                            value={formData.sprint_id || ''}
                                            onChange={e => setFormData({...formData, sprint_id: e.target.value || null})}
                                        >
                                            <option value="">Backlog</option>
                                            {sprints.map(sprint => (
                                                <option key={sprint.id} value={sprint.id}>
                                                    {sprint.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="text-gray-400 absolute right-3 top-3 pointer-events-none" />
                                    </div>
                                </div>
                             )}

                            {/* Assignee */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 block">Assignee</label>
                                <div className="flex items-center p-2 border border-transparent hover:border-gray-200 hover:bg-gray-50 rounded-lg cursor-pointer transition-all group relative">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold mr-3 shadow-sm">
                                        {assigneeProfile ? assigneeProfile.name.charAt(0) : <User size={14}/>}
                                    </div>
                                    <select 
                                        className="bg-transparent text-sm text-gray-700 font-medium focus:ring-0 border-none p-0 w-full cursor-pointer appearance-none z-10"
                                        value={formData.assignee_id || ''}
                                        onChange={e => setFormData({...formData, assignee_id: e.target.value || null})}
                                    >
                                        <option value="">Unassigned</option>
                                        {profiles.length > 0 ? (
                                            profiles.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))
                                        ) : (
                                            <option disabled>No members found</option>
                                        )}
                                    </select>
                                    <ChevronDown size={14} className="text-gray-400 absolute right-2 pointer-events-none" />
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 block">Priority</label>
                                <div className="relative">
                                    <select 
                                        className="w-full bg-gray-50 border border-gray-200 text-sm font-medium rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none transition-colors"
                                        value={formData.priority}
                                        onChange={e => setFormData({...formData, priority: e.target.value as TicketPriority})}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                    <ChevronDown size={14} className="text-gray-400 absolute right-3 top-3 pointer-events-none" />
                                </div>
                            </div>
                            
                            {/* Story Points */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 block">Story Points</label>
                                <div className="flex flex-wrap gap-2">
                                    {[1, 2, 3, 5, 8, 13].map(points => (
                                        <button
                                            key={points}
                                            onClick={() => setFormData({...formData, story_points: points})}
                                            className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all shadow-sm ${
                                                formData.story_points === points 
                                                ? 'bg-blue-600 text-white border-blue-600 scale-105' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                                            }`}
                                        >
                                            {points}
                                        </button>
                                    ))}
                                    <input 
                                        type="number"
                                        placeholder="?"
                                        className="w-12 h-9 text-xs font-bold px-1 border border-gray-200 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                                        value={formData.story_points || ''}
                                        onChange={e => setFormData({...formData, story_points: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>

                             {/* Time Tracking - Simple estimate vs spent logic */}
                             <div className="space-y-3 pt-2 border-t border-gray-50">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-gray-500 flex items-center"><Clock size={12} className="mr-1.5" /> Time Tracking</label>
                                    {formData.time_estimate && formData.time_estimate > 0 && (
                                        <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${formData.time_spent && formData.time_spent > formData.time_estimate ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                style={{width: `${Math.min(((formData.time_spent || 0) / (formData.time_estimate || 1)) * 100, 100)}%`}}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Estimated (m)</span>
                                        <input 
                                            type="number"
                                            className="w-full text-xs font-medium border border-gray-200 rounded p-1.5 bg-white text-gray-900"
                                            value={formData.time_estimate || ''}
                                            onChange={e => setFormData({...formData, time_estimate: parseInt(e.target.value)})}
                                            placeholder="Minutes"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Spent (m)</span>
                                        <input 
                                            type="number"
                                            className="w-full text-xs font-medium border border-gray-200 rounded p-1.5 bg-white text-gray-900"
                                            value={formData.time_spent || ''}
                                            onChange={e => setFormData({...formData, time_spent: parseInt(e.target.value)})}
                                            placeholder="Minutes"
                                        />
                                    </div>
                                </div>
                                {formData.time_estimate && formData.time_estimate > 0 ? (
                                    <div className="flex justify-between text-[10px] text-gray-500 font-medium px-1">
                                        <span>{formatMinutes(formData.time_spent)} spent</span>
                                        <span>{formatMinutes(Math.max(0, formData.time_estimate - (formData.time_spent || 0)))} remaining</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                         {/* Labels */}
                         <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Labels</label>
                             <div className="flex flex-wrap gap-2 items-center min-h-[32px]">
                                 {formData.labels?.map(label => (
                                     <span key={label} className="pl-2.5 pr-1 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-semibold flex items-center hover:bg-gray-300 transition-colors cursor-default">
                                         {label}
                                         <button 
                                             onClick={() => setFormData({...formData, labels: formData.labels?.filter(l => l !== label)})}
                                             className="ml-1 p-0.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100 transition-all"
                                         >
                                             <X size={12} />
                                         </button>
                                     </span>
                                 ))}
                                 {isAddingLabel ? (
                                     <input 
                                         autoFocus
                                         className="w-24 px-2 py-1 text-xs border border-blue-500 rounded-md outline-none bg-white shadow-sm ring-2 ring-blue-100"
                                         value={newLabel}
                                         onChange={e => setNewLabel(e.target.value)}
                                         onBlur={addLabel}
                                         onKeyDown={e => e.key === 'Enter' && addLabel()}
                                         placeholder="Label..."
                                     />
                                 ) : (
                                     <button 
                                         onClick={() => setIsAddingLabel(true)}
                                         className="px-2 py-1 hover:bg-gray-200 text-gray-500 rounded-md text-xs font-bold flex items-center border border-dashed border-gray-300 hover:border-gray-400 transition-all"
                                     >
                                         <Plus size={12} className="mr-1" /> Add
                                     </button>
                                 )}
                             </div>
                         </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200/60">
                        <div className="flex justify-between text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                            <span>Created {ticket ? new Date(ticket.created_at).toLocaleDateString() : 'New'}</span>
                            <span>Updated {ticket ? new Date().toLocaleDateString() : 'Now'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Actions (Sticky) */}
        <div className="p-4 border-t border-gray-100 bg-white rounded-b-xl flex justify-between items-center z-30 shrink-0 relative">
             <div className="flex items-center text-xs text-gray-400 ml-2">
                 {/* Footer info placeholder */}
             </div>
             <div className="flex items-center gap-3">
                 <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 text-gray-600 text-sm font-semibold hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
                    Cancel
                 </button>
                 <button 
                    onClick={handleSave}
                    disabled={!formData.title || isSaving}
                    className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transform active:scale-95 flex items-center"
                 >
                    {isSaving && <Loader2 className="animate-spin mr-2" size={16} />}
                    {isSaving ? 'Saving...' : (ticket ? 'Save Changes' : 'Create Issue')}
                 </button>
             </div>
        </div>

      </div>
    </div>
  );
};