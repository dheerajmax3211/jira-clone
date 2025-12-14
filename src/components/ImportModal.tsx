import React, { useState } from 'react';
import { X, Upload, FileJson, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { parseJsonImport } from '../utils/parser';
import { Board, Sprint, Ticket } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBoardId: string;
  onImport: (data: { boards: Board[], sprints: Sprint[], tickets: Ticket[] }) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, activeBoardId, onImport }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'guide'>('import');
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ boards: number, sprints: number, tickets: number } | null>(null);

  if (!isOpen) return null;

  const handleJsonChange = (val: string) => {
    setJsonInput(val);
    setError(null);
    setStats(null);

    if (!val.trim()) return;

    try {
      const result = parseJsonImport(val, activeBoardId);
      setStats(result.stats);
    } catch (e) {
      // Don't show error immediately while typing, only on blur or if they pause (optional), 
      // but for now we just clear stats if invalid
    }
  };

  const handleImport = () => {
    try {
      const result = parseJsonImport(jsonInput, activeBoardId);
      onImport({
          boards: result.boards,
          sprints: result.sprints,
          tickets: result.tickets
      });
      onClose();
      setJsonInput('');
      setStats(null);
    } catch (e: any) {
      setError("Invalid JSON: " + e.message);
    }
  };

  const copyExample = () => {
    const example = {
      "boards": [
        {
          "id": "b1",
          "name": "My New Project",
          "key": "PROJ",
          "sprints": [
            { "id": "s1", "name": "Sprint 1", "status": "active" }
          ],
          "tickets": [
            { 
              "id": "t1", 
              "title": "Setup Repo", 
              "description": "Initialize git repository and setup CI/CD pipelines.",
              "status": "Done", 
              "type": "Task", 
              "sprint_id": "s1",
              "story_points": 2
            },
            { 
              "id": "t2", 
              "title": "Core Feature", 
              "status": "Todo", 
              "type": "Story", 
              "sprint_id": "s1",
              "story_points": 5 
            }
          ]
        }
      ]
    };
    navigator.clipboard.writeText(JSON.stringify(example, null, 2));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[85vh] ring-1 ring-slate-200 font-sans">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl shrink-0">
            <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shadow-sm">
                    <FileJson size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900">Import Data</h3>
                    <p className="text-xs text-gray-500">Import Boards, Sprints, and Tickets via JSON</p>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded">
                <X size={20} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 shrink-0">
            <button 
                onClick={() => setActiveTab('import')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'import' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                JSON Input
            </button>
            <button 
                onClick={() => setActiveTab('guide')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'guide' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Structure Guide
            </button>
        </div>

        <div className="flex-1 overflow-hidden relative bg-white">
            {activeTab === 'import' ? (
                <div className="h-full flex flex-col p-6">
                    <div className="mb-4 flex justify-between items-end">
                        <label className="block text-sm font-semibold text-gray-700">Paste JSON Data</label>
                        <button onClick={copyExample} className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                            <Copy size={12} /> Copy Example
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <textarea 
                            className={`w-full h-full border rounded-lg p-4 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-800 placeholder:text-gray-400 resize-none ${error ? 'border-red-300 ring-2 ring-red-50' : 'border-gray-200 focus:border-blue-500'}`}
                            value={jsonInput}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            placeholder={`{\n  "boards": [\n    {\n      "name": "My Project",\n      "tickets": [\n        { "title": "Example", "story_points": 3 }\n      ]\n    }\n  ]\n}`}
                            spellCheck={false}
                        />
                    </div>

                    {error && (
                        <div className="mt-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={16} className="mr-2 shrink-0" />
                            {error}
                        </div>
                    )}

                    {stats && !error && (
                        <div className="mt-4 bg-green-50 text-green-700 px-4 py-3 rounded-lg flex gap-6 items-center border border-green-100 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                <span className="text-sm font-bold">Ready to Import:</span>
                            </div>
                            <div className="text-xs font-medium uppercase tracking-wide">
                                <span className="font-bold text-lg mr-1">{stats.boards}</span> Boards
                            </div>
                            <div className="text-xs font-medium uppercase tracking-wide">
                                <span className="font-bold text-lg mr-1">{stats.sprints}</span> Sprints
                            </div>
                            <div className="text-xs font-medium uppercase tracking-wide">
                                <span className="font-bold text-lg mr-1">{stats.tickets}</span> Tickets
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-full overflow-y-auto p-8 prose prose-sm max-w-none text-gray-600">
                    <h3 className="text-gray-900 mt-0">JSON Structure Guide</h3>
                    <p>
                        To import multiple boards, sprints, and tickets at once, use the following structure. 
                        IDs in the JSON are temporary; we re-generate them on import to prevent collisions.
                    </p>

                    <div className="bg-slate-900 rounded-lg p-4 my-4 overflow-x-auto">
<pre className="text-blue-300 text-xs font-mono m-0">
{`{
  "boards": [
    {
      "id": "board-1",             // Used for linking internal items
      "name": "Marketing Launch",
      "key": "MKT",
      "type": "kanban",
      "sprints": [
        {
          "id": "sprint-1",        // Used for linking tickets
          "name": "Q1 Planning",
          "status": "active"
        }
      ],
      "tickets": [
        {
          "title": "Strategy Meeting",
          "description": "Initial meeting to discuss Q1 goals.",
          "type": "Epic",
          "status": "Todo",
          "id": "epic-1"           // Used for parent/child linking
        },
        {
          "title": "Draft Plan",
          "description": "Create the first draft of the marketing plan.",
          "type": "Story",
          "story_points": 5,       // Optional: Estimation
          "parent_id": "epic-1",   // Links to the Epic above
          "sprint_id": "sprint-1"  // Links to Sprint above
        }
      ]
    }
  ]
}`}
</pre>
                    </div>

                    <h4 className="text-gray-900">Fields Reference</h4>
                    <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <li><strong>boards</strong>: Array of Board objects</li>
                        <li><strong>sprints</strong>: Array of Sprint objects (nested)</li>
                        <li><strong>tickets</strong>: Array of Ticket objects</li>
                        <li><strong>description</strong>: (Optional) Ticket description</li>
                        <li><strong>story_points</strong>: (Optional) Number value</li>
                        <li><strong>parent_id</strong>: Links child tickets to Epics</li>
                        <li><strong>sprint_id</strong>: Links tickets to Sprints</li>
                    </ul>
                </div>
            )}
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 shrink-0">
            <button 
                onClick={onClose}
                className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-200 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleImport}
                disabled={!jsonInput.trim() || !!error}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center active:transform active:scale-95"
            >
                <Upload size={18} className="mr-2" />
                Import Data
            </button>
        </div>
      </div>
    </div>
  );
}