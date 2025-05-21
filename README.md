# Smart Document Analyzer

A project that demonstrates Azure Functions, React, Azure OpenAI, and Cosmos DB integration for document analysis.

## Project Overview

This application processes documents using Azure OpenAI to extract key information, then stores results in Cosmos DB and displays them in a React frontend.

## Technologies Used

### Backend (Azure Functions)
- Python 3.9+
- Azure Functions
- Azure OpenAI
- Azure Cosmos DB
- Azure Identity for authentication

### Frontend
- React 18
- MSAL for Azure AD authentication
- Modern UI with responsive design

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   React     │      │   Azure     │      │    Azure    │
│  Frontend   │─────►│  Functions  │─────►│   OpenAI    │
└─────────────┘      └─────────────┘      └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Azure    │
                    │  Cosmos DB  │
                    └─────────────┘
```

## Backend Features

- Event-driven architecture using Azure Functions
- Advanced JSON transformation for handling nested data
- Retry mechanism with exponential backoff for API calls
- Authentication using Azure AD
- Comprehensive unit tests with mocking

## Frontend Features

- Modern React with hooks
- Azure AD authentication using MSAL
- Responsive UI
- Loading state and error handling
- Tabbed interface for displaying analysis results

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- Azure subscription
- Azure Functions Core Tools
- Visual Studio Code

### Local Development

Backend:
```bash
cd backend
pip install -r requirements.txt
func start
```

Frontend:
```bash
cd frontend/document-analyzer
npm install
npm start
```

## Azure Resources Required
- Azure Functions App
- Cosmos DB account with a 'DocumentAnalysis' database and 'Results' collection
- Azure OpenAI service with GPT-4 model deployed
- Azure AD application registration

## Testing
```bash
cd backend
python -m unittest discover tests
```

## Deployment

### Cloud Deployment
This project is designed to be deployed using Azure DevOps Pipelines or GitHub Actions.

Infrastructure is provisioned using Pulumi with templates from: 
https://github.com/TemplateMechanics/pulumi-azure

### Local Development

To develop and run this application, we use Tilt with Kubernetes:

#### Using Kubernetes with Tilt
For local development with Kubernetes, this project uses Tilt to automate the development workflow:

**Prerequisites:**
- Kubernetes cluster (like Docker Desktop with Kubernetes, Minikube, or Kind)
- Tilt installed: [https://tilt.dev/](https://tilt.dev/)
- kubectl configured to your local cluster
- OpenSSL for certificate generation

**Components setup:**
1. **Certificates**: Auto-generated using `./certificates/generate-certs.ps1` for secure local HTTPS
2. **Traefik Ingress**: Handles routing to services with TLS termination using wildcard certificate
3. **Azure Functions Backend**: Containerized Python Azure Functions app
4. **React Frontend**: Containerized React application with serve
5. **Kubernetes Secrets**: Automatically configured for local development

**Local URLs:**
- Backend API: https://document-analyzer-backend.localhost
- Frontend UI: https://document-analyzer-frontend.localhost
- Traefik Dashboard: http://localhost:9000/dashboard/ (when enabled)

**Running with Kubernetes:**
```bash
# First, generate certificates if needed
cd certificates && powershell.exe -File ./generate-certs.ps1

# Return to the project root
cd ..

# Start Tilt
tilt up
```

Tilt will:
- Build the Docker images for both backend and frontend
- Deploy to Kubernetes with configured secrets and resources
- Set up port forwarding and ingress routes
- Watch for file changes and automatically rebuild/redeploy
- Provide live status updates in the Tilt UI (http://localhost:10350)

For more information on Tilt configuration, see the [Tilt Documentation](https://docs.tilt.dev/)

**Traefik Configuration:**

The project uses Traefik as an ingress controller with the following features enabled:
- Automatic TLS termination using locally generated certificates
- Route matching for backend and frontend services
- Dashboard for monitoring (accessible at http://localhost:9000/dashboard/ when enabled)

### Common Development Commands

```bash
# Run backend tests
cd backend && python -m pytest tests/

# Run frontend tests
cd frontend/document-analyzer && npm test

# Build Docker images directly
docker build -t document-analyzer-backend ./backend
docker build -t document-analyzer-frontend ./frontend/document-analyzer

# Stop Tilt development environment
# Press Ctrl+C in the terminal where Tilt is running

# Clean up resources when done
kubectl delete namespace document-analyzer
```

### Troubleshooting

#### Certificate Issues
If you encounter SSL certificate issues:
```powershell
# Regenerate certificates
cd certificates
powershell.exe -File ./generate-certs.ps1
```

#### Kubernetes Connection Problems
If Tilt cannot connect to your Kubernetes cluster:
```powershell
# Verify your kubectl configuration
kubectl config current-context
kubectl cluster-info

# Make sure Docker Desktop Kubernetes is enabled (if using Docker Desktop)
```

#### Ingress Not Working
If applications are not accessible via *.localhost URLs:
```powershell
# Check that Traefik is running
kubectl get pods -n traefik

# Verify your hosts file has the proper entries
# Add to C:\Windows\System32\drivers\etc\hosts:
# 127.0.0.1 document-analyzer-backend.localhost document-analyzer-frontend.localhost
```

### Understanding the Tilt Configuration

The `Tiltfile` contains the configuration for local Kubernetes development:

1. **Extensions Loading**:
   - Uses Helm, Namespace, and Certificate Manager extensions for Kubernetes resource management

2. **Helper Functions**:
   - `certificate_creation`: Generates local SSL certificates using OpenSSL
   - `install_flux`: Sets up Flux for GitOps deployments (if needed)
   - `deploy_container_app`: Automates container deployment with proper resources and configurations

3. **Namespaces and Resources**:
   - Creates dedicated namespaces for services: `flux`, `traefik`, and `document-analyzer`
   - Configures secrets for local development with mock Azure credentials
   - Sets up persistent storage for data retention between deployments

4. **Live Reload**:
   - Watches critical files for changes and automatically rebuilds/redeploys affected components
   - Ensures fast development iterations with minimal manual steps

### Project Structure
```
├── backend/              - Azure Functions backend
│   ├── Dockerfile        - Backend containerization
│   ├── AnalysisFunction/ - Azure Function code
│   └── SharedCode/       - Shared utilities
├── frontend/             - React frontend
│   ├── document-analyzer/
│   │   ├── Dockerfile    - Frontend containerization with serve
│   │   └── src/          - React application code
├── k8s/                  - Kubernetes configuration files
│   ├── secrets.yaml      - Kubernetes secrets for local development
│   └── storage.yaml      - Persistent volume claims for data storage
├── certificates/         - SSL certificates for local HTTPS
│   └── generate-certs.ps1- PowerShell script to generate development certificates
├── Tiltfile              - Tilt configuration for Kubernetes dev
└── README.md             - Project documentation
```