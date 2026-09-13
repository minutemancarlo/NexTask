# NexTask — Priority Matrix & Task Execution

NexTask is an Eisenhower Matrix productivity application built for fast, high-impact task management, deep focus, and seamless integration with OpenProject.

## Features
- **Eisenhower Matrix View**: Prioritize tasks into Q1 (Do First), Q2 (Schedule), Q3 (Delegate), and Q4 (Eliminate).
- **Kanban & List Views**: Switch between Matrix, Kanban boards, and structured lists.
- **Notes & Memos (Micro-Journaling Stream)**:
  - **Inline `#Hashtags` & Autocomplete**: Tag topics dynamically inline (`#work`, `#ideas`, `#project/v1`); typing `#` triggers a real-time searchable autocomplete dropdown.
  - **Interactive Monthly Calendar**: Visual calendar navigation highlighting days with active memos; click any day to filter your memo feed instantly.
  - **Searchable Code Block Language Dropdown**: Insert code blocks with a searchable dropdown covering 35+ languages (Python, TypeScript, SQL, Bash, C#, Go, Rust, Dockerfile, etc.) with clipboard paste support.
  - **Interactive Checklists & Markdown**: Native Markdown renderer supporting clickable interactive checkboxes (`- [ ]` / `- [x]`), blockquotes, syntax labels, line counts, and 1-click code copying.
  - **Stream Organization**: Pin important memos to the top, archive notes, search by keyword, and filter by tags with real-time counts.
  - **Data Backup & Export**: 1-click export of your notes archive into formatted Markdown (`.md`) or raw JSON (`.json`).
- **OpenProject Integration**: Direct sync review for work packages with project filtering, status comparisons, and Excel report extractions.
- **Built-in Pomodoro Timer**: Focus timer integrated directly into your task workflow.
- **Dark & Light Mode**: Clean, responsive, and distraction-free interface.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, SQLite

## Getting Started

### Installation & Quick Start
1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   cd ..
   ```

2. Run with the batch controller (`nextask.bat`):
   - Double-click `nextask.bat` to launch the interactive controller menu.
   - Or run from command prompt / terminal:
     ```cmd
     nextask.bat start     :: Starts backend & frontend silently in background
     nextask.bat stop      :: Stops all running services cleanly
     nextask.bat status    :: Checks live status of ports 3001 & 5173
     nextask.bat restart   :: Restarts both services
     nextask.bat open      :: Opens http://localhost:5173 in default browser
     ```

3. Browser access:
   - Frontend UI: `http://localhost:5173`
   - Backend API: `http://localhost:3001`

## License
MIT
