# Jira Clone Data Import Guide

You can bulk import projects, sprints, and tickets using JSON. This is ideal for migrating from other tools or generating project plans using AI.

## How to Import

1.  Copy the JSON structure below (choose Scrum or Kanban).
2.  Open **Import Issues** in the sidebar.
3.  Paste the JSON into the text area.
4.  Click **Import Data**.

## 1. Scrum Project (With Sprints)

Use this format for software development teams working in iterations.

```json
{
  "boards": [
    {
      "id": "board-scrum",
      "name": "Mobile App Launch",
      "key": "MOB",
      "type": "scrum",
      "sprints": [
        {
          "id": "sprint-1",
          "name": "Sprint 1",
          "status": "active"
        }
      ],
      "tickets": [
        {
          "title": "Login Screen",
          "type": "Story",
          "status": "In Progress",
          "sprint_id": "sprint-1",
          "story_points": 5
        },
        {
          "title": "Logout Feature",
          "type": "Story",
          "status": "Todo",
          "sprint_id": "sprint-1",
          "story_points": 3
        }
      ]
    }
  ]
}
```

## 2. Kanban Project (Continuous Flow)

Use this format for marketing teams, support desks, or continuous delivery teams. Note the absence of sprints and the custom columns definition.

```json
{
  "boards": [
    {
      "id": "board-kanban",
      "name": "Marketing Operations",
      "key": "MKT",
      "type": "kanban",
      "columns": [
         { "id": "Todo", "title": "Ideas", "limit": 0 },
         { "id": "In Progress", "title": "Working", "limit": 3 },
         { "id": "Done", "title": "Published", "limit": 0 }
      ],
      "tickets": [
        {
          "title": "Write Newsletter",
          "type": "Task",
          "status": "Working",
          "priority": "High"
        },
        {
          "title": "Update Twitter Header",
          "type": "Task",
          "status": "Ideas",
          "priority": "Low"
        }
      ]
    }
  ]
}
```

## AI Prompt

Copy this prompt to ChatGPT or Claude:

> "Generate a JSON object for a Jira-like import. 
> Create a [Scrum/Kanban] board named '[PROJECT NAME]'.
> [If Scrum]: Include 2 sprints (one active, one future).
> [If Kanban]: Define columns: Todo, In Progress (limit 3), Done.
> Add 5 tickets with realistic titles, descriptions, and statuses mapped to the columns/sprints.
> Return ONLY the JSON."
