import { Ticket, Sprint, Board } from '../types';

/**
 * Handles the heavy lifting of importing data.
 * 
 * I switched this from Markdown to JSON because MD was too flimsy for 
 * maintaining relationships between Boards, Sprints, and Tickets.
 * 
 * Key logic: We regenerate IDs for EVERYTHING on import. 
 * This prevents collisions if the user imports the same file twice.
 * We use a Map to link the 'old' JSON IDs to the 'new' database IDs.
 */

interface ImportData {
  boards?: Partial<Board>[];
  tickets?: Partial<Ticket>[]; // Support loose tickets for partial imports
}

interface ParsedResult {
  boards: Board[];
  sprints: Sprint[];
  tickets: Ticket[];
  stats: {
    boards: number;
    sprints: number;
    tickets: number;
  };
}

export const parseJsonImport = (jsonString: string, currentBoardId?: string): ParsedResult => {
  let data: ImportData;
  
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    throw new Error("Invalid JSON format");
  }

  const result: ParsedResult = {
    boards: [],
    sprints: [],
    tickets: [],
    stats: { boards: 0, sprints: 0, tickets: 0 }
  };

  // Maps to track old_id -> new_uuid relationships
  const boardMap = new Map<string, string>();
  const sprintMap = new Map<string, string>();
  const ticketMap = new Map<string, string>();

  // 1. Process Boards
  if (data.boards && Array.isArray(data.boards)) {
    data.boards.forEach((b: any) => {
      const newId = crypto.randomUUID();
      // Store mapping if the input had an ID, otherwise we can't link children to it easily
      if (b.id) boardMap.set(b.id, newId);

      const newBoard: Board = {
        id: newId,
        name: b.name || 'Imported Project',
        key: b.key || 'IMP',
        type: b.type || 'kanban',
        columns: b.columns || [] 
      };
      result.boards.push(newBoard);

      // 1a. Process Sprints nested in Boards
      if (b.sprints && Array.isArray(b.sprints)) {
        b.sprints.forEach((s: any) => {
          const newSprintId = crypto.randomUUID();
          if (s.id) sprintMap.set(s.id, newSprintId);

          result.sprints.push({
            id: newSprintId,
            board_id: newId,
            name: s.name || 'Imported Sprint',
            status: s.status || 'future',
            goal: s.goal,
            start_date: s.start_date,
            end_date: s.end_date
          });
        });
      }

      // 1b. Process Tickets nested in Boards
      if (b.tickets && Array.isArray(b.tickets)) {
        // We process these in the generic ticket processor below, 
        // but we need to flatten them out first or handle them here.
        // For simplicity, let's just add them to the main tickets array 
        // but ensure we pass the context that they belong to this board.
        b.tickets.forEach((t: any) => {
          t._temp_board_id = b.id; // Mark for mapping
          if (!data.tickets) data.tickets = [];
          data.tickets.push(t);
        });
      }
    });
  }

  // 2. Process Tickets (Flat list or extracted from boards)
  if (data.tickets && Array.isArray(data.tickets)) {
    // First Pass: Create IDs and basic fields
    data.tickets.forEach((t: any) => {
      const newId = crypto.randomUUID();
      if (t.id) ticketMap.set(t.id, newId);

      // Resolve Board ID
      // Priority: Mapped ID from import -> Current Active Board -> First Imported Board -> Null
      let targetBoardId = currentBoardId;
      if (t._temp_board_id && boardMap.has(t._temp_board_id)) {
        targetBoardId = boardMap.get(t._temp_board_id);
      } else if (t.board_id && boardMap.has(t.board_id)) {
        targetBoardId = boardMap.get(t.board_id);
      } else if (!targetBoardId && result.boards.length > 0) {
        targetBoardId = result.boards[0].id;
      }

      // Resolve Sprint ID
      let targetSprintId = t.sprint_id && sprintMap.has(t.sprint_id) ? sprintMap.get(t.sprint_id) : null;

      // Safe parsing for story points (handle string "5" vs number 5)
      let parsedPoints = t.story_points;
      if (typeof t.story_points === 'string') {
        parsedPoints = parseInt(t.story_points, 10);
        if (isNaN(parsedPoints)) parsedPoints = undefined;
      }

      result.tickets.push({
        id: newId,
        board_id: targetBoardId!, // It might be null if no boards exist, handled by app logic
        sprint_id: targetSprintId,
        title: t.title || 'Untitled Ticket',
        description: t.description || '',
        status: t.status || 'Todo',
        type: t.type || 'Story',
        priority: t.priority || 'Medium',
        story_points: parsedPoints,
        labels: t.labels || [],
        is_flagged: !!t.is_flagged,
        // Store the raw parent ID for the second pass
        parent_id: t.parent_id || null, 
        assignee_id: null, // We don't map users yet, too risky with Auth IDs
        created_at: new Date().toISOString()
      });
    });

    // Second Pass: Link Parents (Epics) and Dependencies
    result.tickets.forEach(ticket => {
      // Remap Parent ID
      if (ticket.parent_id && ticketMap.has(ticket.parent_id)) {
        ticket.parent_id = ticketMap.get(ticket.parent_id)!;
      } else {
        // If parent doesn't exist in this import batch, we orphan it (set to null)
        // because linking to an ID that doesn't exist in DB or Import is impossible.
        ticket.parent_id = null;
      }
    });
  }

  result.stats = {
    boards: result.boards.length,
    sprints: result.sprints.length,
    tickets: result.tickets.length
  };

  return result;
};