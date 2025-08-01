
# Multi-Agent WorkFlow UI

A comprehensive React-based user interface for managing multi-agent workflows, bot creation, and tool deployment. This project provides an intuitive platform for orchestrating intelligent agents, creating custom bots, and managing tools with real-time deployment tracking.

## Features

### 🔐 Authentication & Security
- JWT-based authentication with access and refresh tokens
- 6-hour inactivity auto-logout for enhanced security
- Admin dashboard for user and client management
- Role-based access control (admin/user)
- Secure logout with complete localStorage clearing

### 🤖 Bot & Workflow Management
- **Bot Library**: Browse, create, and manage intelligent bots
- **Flow Library**: Design and manage complex multi-agent workflows
- **Tool Library**: Create, deploy, and manage custom tools with real-time status tracking
- **Interactive Chat**: Communicate with bots and test functionality

### 🛠️ Tool Development
- **Custom Tool Creation**: Build tools with Python code using Monaco editor
- **Real-time Deployment**: Non-blocking tool deployment with persistent status tracking
- **Requirement Management**: Automatic dependency handling with duplicate prevention
- **Environment Variables**: Secure configuration management

### 👥 Admin Features
- **Client Management**: Create and manage client organizations
- **User Management**: Add users, reset passwords, view roles and status
- **System Administration**: Comprehensive dashboard with dark theme
- **API Integration**: Centralized API configuration and management

### 🎨 Modern UI/UX
- **Dark Theme**: Consistent dark theme throughout the application
- **Responsive Design**: Mobile-friendly interface with collapsible sidebar
- **Real-time Updates**: Live status updates and notifications
- **Intuitive Navigation**: Clean, modern interface with excellent usability

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn package manager

### Installation
1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd Multi-Agent-WorkFlow-UI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment (optional):
   ```bash
   # Copy .env.example to .env and configure API endpoints
   cp .env.example .env
   ```

### Running the Application

#### Development Mode
Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173` (or next available port).

#### Production Build
```bash
npm run build
npm run preview
```

## Project Structure

```
Multi-Agent-WorkFlow-UI/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base UI components (shadcn/ui)
│   │   ├── AppSidebar.tsx   # Main navigation sidebar
│   │   ├── ToolLibrary.tsx  # Tool management interface
│   │   └── FunctionDialog.tsx # Tool creation/editing dialog
│   ├── pages/               # Page components
│   │   ├── Login.tsx        # Authentication page
│   │   ├── AdminDashboard.tsx # Admin management interface
│   │   ├── BotCreator.tsx   # Bot creation interface
│   │   └── FlowLibrary.tsx  # Workflow management
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication state management
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuthenticatedFetch.tsx # Authenticated API calls
│   │   └── use-toast.ts     # Toast notifications
│   ├── services/            # API service layers
│   │   └── api.ts          # API client configuration
│   ├── lib/                 # Utility libraries
│   ├── assets/              # Static assets
│   └── config.ts           # Application configuration
├── public/                  # Static public assets
├── components.json          # shadcn/ui configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── vite.config.ts          # Vite bundler configuration
└── package.json            # Project dependencies and scripts
```

## Configuration

### API Configuration
Update `src/config.ts` to configure your API endpoints:

```typescript
export const API_BASE_URL = process.env.VITE_API_BASE_URL || "http://localhost:8000";
export const CLIENT_ID = getStoredClientId() || "default-client";
```

### Environment Variables
Create a `.env` file in the root directory:

```bash
VITE_API_BASE_URL=http://your-api-server:port
```

## Key Features in Detail

### Authentication System
- **JWT Tokens**: Secure access with 15-minute access tokens and longer-lived refresh tokens
- **Auto-Refresh**: Automatic token renewal before expiration
- **Inactivity Timeout**: 6-hour inactivity logout for security
- **Client-Based Auth**: Multi-tenant authentication with client selection

### Tool Development Workflow
1. **Create Tool**: Use the Monaco code editor to write Python functions
2. **Configure Dependencies**: Specify requirements and environment variables
3. **Deploy**: Real-time deployment with status tracking
4. **Monitor**: Persistent deployment state across UI sessions

### Admin Dashboard
- **User Management**: Create users, reset passwords, view roles
- **Client Management**: Create and manage client organizations
- **System Monitoring**: Overview of system users and clients

## Technologies Used

### Core Framework
- **React 18**: Modern React with hooks and context
- **TypeScript**: Full type safety and better developer experience
- **Vite**: Fast build tool and development server

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible UI components
- **Lucide React**: Modern icon library
- **Monaco Editor**: VS Code editor for code editing

### State Management & API
- **React Context**: Authentication and global state
- **React Router**: Client-side routing
- **Fetch API**: HTTP client with authentication
- **Local Storage**: Persistent client-side storage

### Development Tools
- **ESLint**: Code linting and quality checks
- **PostCSS**: CSS processing
- **TypeScript**: Static type checking

## API Integration

The application integrates with a multi-agent backend API providing:

- **Authentication**: `/auth/login`, `/auth/refresh`, `/auth/logout`
- **Admin APIs**: `/auth/admin/users`, `/auth/admin/login`
- **Client Management**: `/clients/`
- **Tool Management**: `/tools/`, tool deployment and status tracking
- **Bot Management**: Bot creation and management APIs

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team.

    Name: Samar K
    Github: @samar-kapture
    Email: samar.k@kapturecrm.com
