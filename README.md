<p align="center">
  <img src="docs/screenshots/dashboard-overview.png" alt="KAOS Dashboard" width="800">
</p>

<h1 align="center">⚡ KAOS-UI</h1>

<p align="center">
  <strong>Kubernetes Agent Orchestration System - User Interface</strong>
  <br>
  <em>A modern dashboard for managing AI agents, MCP servers, and Model APIs on Kubernetes</em>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-demo">Demo</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

## 🎯 What is KAOS?

**KAOS** (Kubernetes Agent Orchestration System) provides Kubernetes-native Custom Resource Definitions (CRDs) for deploying and managing:

- 🤖 **Agents** - Autonomous AI agents with memory, tools, and multi-agent hierarchies
- 🔧 **MCP Servers** - Model Context Protocol servers for tool integrations
- 🧠 **Model APIs** - LLM API endpoints with automatic scaling and load balancing

**KAOS-UI** is the web-based dashboard that provides real-time visibility and control over your agentic infrastructure.

---

## ✨ Features

### 📊 Real-Time Dashboard
- Live resource monitoring with auto-refresh
- Pod health status and deployment state
- Quick actions for common operations

### 🤖 Agent Management
| Feature | Description |
|---------|-------------|
| **Overview** | See agent configuration, status, and dependencies |
| **Chat Interface** | Interact with agents directly through the UI |
| **Memory Viewer** | Inspect agent memory and conversation history |
| **Pod Management** | View logs, restart, and scale agent pods |

### 🔧 MCP Server Management
- Configure tool servers with environment variables
- Monitor server health and connectivity
- Debug tool calls with the built-in diagnostics panel

### 🧠 Model API Management  
- Deploy and configure LLM endpoints
- Monitor API performance and latency
- Configure gateway routes and replicas

### 🔐 Kubernetes Native
- **Secrets Management** - Create, view, and delete K8s secrets
- **Namespace Switching** - Seamlessly work across namespaces
- **Pod Operations** - View logs, delete pods, monitor resources

---

## 🚀 Quick Start

### Option 1: Use the Hosted Version

Visit the live deployment and connect to your cluster:

```
https://axsaucedo.github.io/kaos-ui/?kubernetesUrl=YOUR_K8S_PROXY_URL&namespace=YOUR_NAMESPACE
```

**Query Parameters:**
| Parameter | Description | Default |
|-----------|-------------|---------|
| `kubernetesUrl` | URL to your Kubernetes API proxy | `http://localhost:8010` |
| `namespace` | Default namespace to select | `default` |

### Option 2: Run Locally

```bash
# Clone the repository
git clone https://github.com/axsaucedo/kaos-ui.git
cd kaos-ui

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Option 3: Connect to a Cluster

1. Set up `kubectl proxy` or use a CORS-enabled proxy:
   ```bash
   kubectl proxy --port=8010 --address=0.0.0.0 --accept-hosts='.*'
   ```

2. Open KAOS-UI and enter your proxy URL in Settings

---

## 🎬 Demo

### End-to-End Workflow

This demo showcases a multi-agent hierarchy in the `kaos-hierarchy` namespace:

#### 1. Dashboard Overview
The main dashboard provides at-a-glance visibility into all your agentic resources:

![Dashboard Overview](docs/screenshots/dashboard-overview.png)

#### 2. Agent Hierarchy
Navigate complex multi-agent setups with supervisor/worker relationships:

<!-- Placeholder for actual screenshot -->
*Screenshot: Navigate to Agents → Select an agent to view its configuration and dependencies*

#### 3. Agent Chat Interface
Interact with deployed agents directly from the UI:

<!-- Placeholder for actual screenshot -->
*Screenshot: Use the Chat tab to send messages to your agent*

#### 4. Memory Inspection
Debug agent behavior by inspecting its memory state:

<!-- Placeholder for actual screenshot -->
*Screenshot: View agent memory entries and conversation history*

#### 5. Pod Logs & Management
Monitor and troubleshoot with real-time pod logs:

<!-- Placeholder for actual screenshot -->
*Screenshot: View streaming pod logs and restart containers*

#### 6. Secret Management
Securely manage API keys and credentials:

<!-- Placeholder for actual screenshot -->
*Screenshot: Create and manage Kubernetes secrets*

---

## 📖 Documentation

Comprehensive documentation is available:

| Document | Description |
|----------|-------------|
| [📱 UI Guide](docs/UI.md) | Complete guide to all screens and features |
| [🔧 Configuration](docs/CONFIGURATION.md) | Connection settings and customization |
| [🚀 Deployment](docs/DEPLOYMENT.md) | Deployment options and CI/CD |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        KAOS-UI                              │
│                   (React + TypeScript)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Dashboard  │  │   Agents    │  │    MCP Servers      │ │
│  │  Overview   │  │   Detail    │  │    Management       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Model APIs │  │    Pods     │  │      Secrets        │ │
│  │  Management │  │    & Logs   │  │    Management       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Kubernetes Cluster                         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Agent     │  │  MCPServer  │  │     ModelAPI        │ │
│  │    CRD      │  │     CRD     │  │       CRD           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │          KAOS Operator (controller-manager)             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 🚢 Deployment

### GitHub Pages Versions

The UI is deployed to GitHub Pages with versioned paths:

| Path | Description |
|------|-------------|
| [/kaos-ui/latest/](https://axsaucedo.github.io/kaos-ui/latest/) | Latest stable release |
| [/kaos-ui/dev/](https://axsaucedo.github.io/kaos-ui/dev/) | Development build (from main) |
| `/kaos-ui/vX.Y.Z/` | Specific version releases |

The root path `/kaos-ui/` redirects to `/kaos-ui/latest/`.

### Release Process

Releases are triggered by creating a git tag:

```bash
# Create and push a release tag
git tag v1.0.0
git push origin v1.0.0
```

This triggers the release workflow which:
1. Builds the app for the versioned path (`/kaos-ui/v1.0.0/`)
2. Updates `/kaos-ui/latest/` to point to this version
3. Creates a GitHub Release with auto-generated notes
4. Opens a PR to bump the VERSION file

### Custom Deployment

Build the static files:

```bash
# Build with custom base path
VITE_BASE=/your-path/ npm run build
```

Deploy the `dist/` folder to any static hosting service:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any web server

---

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | Component library |
| **Zustand** | State management |
| **React Router** | Navigation |
| **TanStack Query** | Data fetching |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- [KAOS Operator](https://github.com/axsaucedo/kaos) - The Kubernetes operator
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol specification
- [Report Issues](https://github.com/axsaucedo/kaos-ui/issues) - Bug reports and feature requests

---

<p align="center">
  <strong>Built with ❤️ for the AI Agent community</strong>
</p>
