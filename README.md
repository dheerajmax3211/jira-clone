# Jira Clone

A project management tool that tries to be fast and simple. Built because I wanted something snappier than the real thing for my personal projects.

**Author:** Dheeraj Srinivasa

## Features

- **Project Management:** Create multiple projects (Boards).
- **Agile Support:** 
  - **Scrum:** Full Sprint lifecycle management (Backlog -> Active Sprint -> Closed).
  - **Kanban:** Continuous flow boards with WIP limits and no sprint overhead.
- **Issue Tracking:** Create Epics, Stories, Tasks, and Bugs.
- **Rich Interaction:** Drag-and-drop, rich text editing (markdown), subtasks.
- **Team Management:** Add team members (linked via Supabase Auth).
- **File Attachments:** Upload images/docs.
- **Import:** Paste json to bulk create tickets (super useful with ChatGPT).
- **Offline/Demo Mode:** Works with LocalStorage if you don't want to set up a backend.

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, TailwindCSS
- **Backend:** Supabase (PostgreSQL, Storage)
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js (v18+)

### Installation

1.  Clone it:
    ```bash
    git clone https://github.com/dheerajmax3211/jira-clone.git
    cd jira-clone
    ```

2.  Install deps:
    ```bash
    npm install
    ```

3.  Run locally:
    ```bash
    npm run dev
    ```

### Supabase Setup (Optional but Recommended)

If you want real-time sync, file uploads, and auth, you need Supabase.

1.  Create a project at [Supabase](https://supabase.com).
2.  Add your keys to `.env`:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```
3.  **Run the following SQL in your Supabase SQL Editor.** This sets up the tables, the storage bucket, and the security policies.

## Master Database Reset Script

**WARNING:** This script drops existing tables. Use this to set up a fresh database or reset everything.

```sql
-- 1. DROP EXISTING TABLES & POLICIES (Start Fresh)
drop table if exists ticket_history cascade;
drop table if exists attachments cascade;
drop table if exists comments cascade;
drop table if exists tickets cascade;
drop table if exists sprints cascade;
drop table if exists boards cascade;
drop table if exists profiles cascade;

-- 2. CREATE TABLES
create table boards (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    key text,
    type text default 'kanban',
    columns jsonb default '[]',
    created_at timestamp with time zone default now()
);

create table tickets (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    status text,
    type text,
    priority text,
    sprint_id uuid,
    board_id uuid references boards(id) on delete cascade,
    parent_id uuid references tickets(id),
    assignee_id uuid,
    story_points integer,
    labels text[],
    subtasks jsonb default '[]',
    is_flagged boolean default false,
    linked_tickets jsonb default '[]',
    time_estimate integer,
    time_spent integer,
    created_at timestamp with time zone default now()
);

create table sprints (
    id uuid primary key default gen_random_uuid(),
    board_id uuid references boards(id) on delete cascade,
    name text,
    status text,
    goal text,
    start_date timestamp,
    end_date timestamp,
    created_at timestamp with time zone default now()
);

create table profiles (
    id uuid primary key default gen_random_uuid(),
    name text,
    email text,
    role text,
    avatar_url text
);

create table comments (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid references tickets(id) on delete cascade,
    content text,
    user_name text,
    created_at timestamp with time zone default now()
);

create table attachments (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid references tickets(id) on delete cascade,
    file_name text not null,
    file_path text not null,
    file_type text,
    file_size integer,
    uploader_id uuid references profiles(id),
    created_at timestamp with time zone default now()
);

create table ticket_history (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid references tickets(id) on delete cascade,
    field text,
    old_value text,
    new_value text,
    user_id uuid,
    user_name text,
    created_at timestamp with time zone default now()
);

-- 3. SETUP STORAGE
insert into storage.buckets (id, name, public) 
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- 4. ENABLE SECURITY (RLS)
alter table profiles enable row level security;
alter table boards enable row level security;
alter table tickets enable row level security;
alter table sprints enable row level security;
alter table comments enable row level security;
alter table ticket_history enable row level security;
alter table attachments enable row level security;

-- 5. CREATE PERMISSIVE POLICIES (Allow all authenticated users to do everything)
create policy "Enable all access for authenticated users" on profiles for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on boards for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on tickets for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on sprints for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on comments for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on ticket_history for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on attachments for all using (auth.role() = 'authenticated');

-- 6. STORAGE POLICIES
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Authenticated Delete" on storage.objects;

create policy "Public Access" on storage.objects for select to public using ( bucket_id = 'attachments' );
create policy "Authenticated Upload" on storage.objects for insert to authenticated with check ( bucket_id = 'attachments' );
create policy "Authenticated Delete" on storage.objects for delete to authenticated using ( bucket_id = 'attachments' );
```

## Contributing

Pull requests are welcome. If you find a bug, feel free to fix it!

## License

[MIT](https://choosealicense.com/licenses/mit/)
