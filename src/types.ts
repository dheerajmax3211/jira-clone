/**
 * Core type definitions.
 * 
 * Note to self: Keep these synced with the Supabase DB schema.
 * If I change a field here, run the migration SQL or things will break.
 */

export type TicketStatus = string; // kept as string to allow users to add custom columns later
export type TicketType = 'Epic' | 'Story' | 'Task' | 'Bug';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'Admin' | 'Member' | 'Viewer';
}

export interface BoardColumn {
  id: string;
  title: string;
  limit?: number; // WIP Limits for Kanban lovers
}

export interface Board {
  id: string;
  name: string;
  key: string; // The short project code (e.g., 'PROJ')
  type: 'scrum' | 'kanban';
  columns?: BoardColumn[]; // JSONB column in DB
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  ticket_id: string;
  content: string;
  created_at: string;
  user_name: string;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploader_id: string;
  created_at: string;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  user_name: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  type: TicketType;
  priority: TicketPriority;
  sprint_id: string | null;
  board_id: string;
  parent_id: string | null;
  assignee_id: string | null;
  story_points?: number;
  time_estimate?: number; // Minutes
  time_spent?: number;    // Minutes
  labels?: string[];
  linked_tickets?: { id: string; relation: 'blocks' | 'is_blocked_by' | 'relates_to' }[];
  subtasks?: Subtask[]; 
  is_flagged?: boolean; 
  created_at: string;
}

export interface Sprint {
  id: string;
  board_id: string;
  name: string;
  status: 'active' | 'future' | 'closed';
  goal?: string;
  start_date?: string;
  end_date?: string;
}