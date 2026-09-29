# GitLab Task Manager — Chrome Extension

> Unified GitLab Task Management Dashboard in a Chrome Extension (Manifest V3)

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Table | TanStack React Table v8 |
| State | Zustand v5 |
| Storage | `chrome.storage.sync` |
| API | GitLab REST v4 + GraphQL |

---

## 📁 Project Structure

```
gittu-task/
├── manifest.json              # Chrome Extension Manifest V3
├── vite.config.js             # Vite + Tailwind + extension build
├── public/
│   └── icons/                 # Extension icons (16/32/48/128px)
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                # Root app with view routing
│   ├── index.css              # Global styles (Tailwind v4 theme)
│   ├── lib/
│   │   └── utils.js           # cn(), storage, formatDate, debounce
│   ├── services/
│   │   └── gitlabApi.js       # All GitLab REST + GraphQL API calls
│   ├── store/
│   │   └── useStore.js        # Zustand global state store
│   └── components/
│       ├── Settings.jsx        # PAT + URL configuration screen
│       ├── Dashboard.jsx       # Main dashboard container
│       ├── TaskTable.jsx       # Interactive data table
│       ├── TaskModal.jsx       # Create/edit task modal
│       └── ui/
│           ├── index.jsx       # Core UI components
│           └── overlay.jsx     # Modal, Dropdown, Toast
└── dist/                      # Built Chrome Extension (load this)
```

---

## 🛠️ Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (localhost:5174)
npm run build      # Build for Chrome loading → dist/
```

---

## 🧩 Loading in Chrome

1. Run `npm run build` → produces the `dist/` folder
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked** → select the `dist/` folder
5. The extension icon appears in your toolbar

---

## ⚙️ First-Time Setup

1. Click the extension icon
2. Click **Connect GitLab Account**
3. Enter your **GitLab Instance URL**
4. Enter your **Personal Access Token** (needs `api` + `read_user` scopes)
5. Click **Test Connection** then **Save & Connect**

---

## ✨ Key Features

### Dashboard
- Stats bar — Total / Open / Closed / Overdue counts
- Global search — filters across all task fields
- Filter bar — by project, status, or label
- Loading progress — Per-project fetch progress indicator

### Task Table
- Inline title editing — Click any title to edit in-place
- Status toggle — Click badge to open/close tasks
- Assignee avatars with overflow count
- Color-coded label badges
- Due date coloring (red = overdue, amber = today/tomorrow)
- Column sorting + 15/30/50 pagination
- Action menu — Edit, open in GitLab, toggle state, delete with confirmation

### Task Creation/Editing
- Tabbed modal (Details + Labels tabs)
- Project selector, label picker with color creation
- Optimistic updates — UI updates instantly

---

## 🔑 Required GitLab Scopes

Your Personal Access Token needs:
- `api` — Read/write access to projects and issues
- `read_user` — Verify identity on login
