# 🦊 GitLab Task Manager — Chrome Extension

> A unified, high-performance task management dashboard for GitLab, packaged as a modern Chrome Extension (Manifest V3). Manage all your GitLab projects, issues, milestones, and custom workflows from one sleek interface.

---

## ⚡ TL;DR — Quick Install (No Coding Required)

Want to start using it right away without running any build commands?

1. Go to the [**Releases**](https://github.com/Shariar-Hasan/gitlab-task-management/releases) section of this repository.
2. Download the latest release `.zip` file (e.g., `gitlab-task-manager-vX.X.X.zip`).
3. Extract (unzip) the file to a folder on your computer.
4. Open Google Chrome or any Chromium-based browser (Edge, Brave, Arc, Opera, Vivaldi):
   - Navigate to `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`).
   - Turn **ON** the **Developer mode** toggle (usually in the top-right corner).
   - Click the **"Load unpacked"** button in the top-left.
   - Select the unzipped folder.
5. 🎉 Done! Pin the extension icon to your browser toolbar and click it to get started.

---

## 🚀 Key Features

- **Multi-Project Hub**: Consolidate issues across all your GitLab projects into a single, lightning-fast dashboard.
- **Rich Markdown Editor & Direct Photo Uploads**:
  - Full-featured Markdown editor for task descriptions with formatting tools and live preview.
  - **Zero Local Storage Image Uploads**: Drag-and-drop or paste (`Ctrl+V`) images directly into descriptions. Images upload straight to your GitLab server via GitLab's Uploads API, inserting direct remote server links (`https://gitlab.com/.../uploads/...`). No heavy base64 strings in your storage!
- **Extended Custom Statuses**:
  - Beyond standard GitLab `Opened` and `Closed`, use custom workflow states: `Pending`, `Backlog`, `Ongoing`, and `Testing`.
- **Global Shared Labels**:
  - Define custom global tags with colors in Settings. When assigned to a task, they automatically sync and auto-create in the GitLab project if they don't exist yet.
- **Fast Inline Title Editing**:
  - Click any task title in the table to edit in-place; click outside or press Enter to save instantly.
- **Pin / Unpin Tasks**:
  - Pin high-priority tasks to keep them at the top of your list with smooth reorder animations.
- **Color-Coded Due Dates**:
  - One-line clean date display with instant visual cues:
    - 🔴 **Red**: Overdue / passed
    - 🟠 **Amber / Orange**: Due today or tomorrow
    - 🟢 **Green**: Upcoming
- **Customizable Appearance**:
  - Pick your own custom **Accent Color** in settings.
  - Toggle between **Dark**, **Light**, or **System** themes.
  - Choose between **12-hour (AM/PM)** or **24-hour** clock formats.
  - Multi-select filters for Projects, Statuses, and Labels, with configurable default filters on startup.
- **Global Confirmation Modal**:
  - Safe task deletion backed by a non-blocking confirmation dialog (`useConfirm()`).

---

## ⚙️ Initial Setup & Connection

1. Click the **GitLab Task Manager** icon in your browser toolbar.
2. In the setup / settings screen, configure:
   - **GitLab Instance URL**: Default is `https://gitlab.com` (supports self-hosted GitLab instances as well, e.g., `https://gitlab.yourcompany.com`).
   - **Personal Access Token (PAT)**: Create a token in GitLab (**User Settings → Access Tokens**).
3. **Required Token Scopes**:
   - `api` — Grants read/write access to projects, issues, labels, and file uploads.
   - `read_user` — Grants read access to verify your user profile.
4. Click **"Test Connection"**, then **"Save & Connect"**. Your projects and issues will load immediately!

---

## 🛠️ For Developers (Build From Source)

If you'd like to inspect the code, customize it, or build it yourself:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm`

### Installation & Build

```bash
# 1. Clone the repository
git clone https://github.com/Shariar-Hasan/gitlab-task-management.git
cd gitlab-task-management

# 2. Install dependencies
npm install

# 3. Run development server (runs at http://localhost:5174 for standalone browser testing)
npm run dev

# 4. Build extension bundle (outputs ready-to-load extension in dist/)
npm run build
```

### Load Your Local Build in Chrome:
1. Open `chrome://extensions/`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select the `dist/` directory inside your cloned folder.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + CSS Variables |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Table Engine** | [TanStack Table v8](https://tanstack.com/table/v8) |
| **Markdown** | [Marked](https://marked.js.org/) + GFM (GitHub/GitLab Flavored Markdown) |
| **State Management** | [Zustand v5](https://zustand-demo.pmnd.rs/) |
| **Storage & Sync** | `chrome.storage.sync` with local fallback |
| **API** | GitLab REST API v4 |

---

## 📄 License

Distributed under the MIT License. Feel free to use, modify, and contribute!
