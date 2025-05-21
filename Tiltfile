###############################################################################
# LOAD TILT EXTENSIONS (only non-built-in functions)
###############################################################################

load("ext://helm_remote", "helm_remote")
load("ext://namespace", "namespace_yaml")
load("ext://cert_manager", "deploy_cert_manager")
load("ext://git_resource", "git_resource")

###############################################################################
# HELPER FUNCTIONS
###############################################################################


# Detect OS Type
def get_os_type():
    windows_check = str(local("echo %OS%", quiet=True)).strip().lower()
    if "windows" in windows_check:
        return "windows"
    
    # If not Windows, assume Linux/macOS
    uname_result = str(local("uname", quiet=True)).strip().lower()
    if "darwin" in uname_result:
        return "macos"
    elif "linux" in uname_result:
        return "linux"
    
    return "unknown"

# Create certificates using a local PowerShell script
def certificate_creation(service_name):
    build_context = "./certificates"
    service_name_lower = service_name.lower()
    os_type = get_os_type()

    if os_type == "windows":
        command = "cd {} && powershell.exe -File ./generate-certs.ps1".format(build_context)
    elif os_type == "macos":
        command = "cd {} && sudo pwsh -File ./generate-certs.ps1".format(build_context)
    else:  # Assume Linux
        command = "cd {} && pwsh -File ./generate-certs.ps1".format(build_context)

    local_resource(
        "{}-certificate-creation".format(service_name_lower),
        command,
        labels=["Local-Certificates"],
    )

    local_resource(
        "{}-edge-certificate-install".format(service_name_lower),
        "cd {} && kubectl delete secret wildcard-tls-dev --ignore-not-found -n traefik && kubectl create secret tls wildcard-tls-dev -n traefik --key ./intermediateCA/private/localhost.key.pem --cert ./intermediateCA/certs/localhost-chain.cert.pem".format(build_context),
        deps=["{}-certificate-creation".format(service_name_lower), "k8s_namespace"],
        labels=["Local-Certificates"]
    )

def install_flux(service_name):
    local_resource(
        "{}-flux-install".format(service_name),
        "flux install",
        deps=["k8s_namespace"],
        labels=["Flux"]
    )

# Create a Kubernetes namespace using a YAML snippet from the namespace extension
def k8s_namespace(namespace_name, allow_duplicates=False):
    k8s_yaml(
        namespace_yaml(namespace_name),
        allow_duplicates=allow_duplicates,
    )

# Deploy a Helm chart that lives in your local helm/ folder
def k8s_helm(service_name, namespace):
    chart_path = "./helm/{}".format(service_name)
    values_path = "./helm/{}/values.yaml".format(service_name)
    k8s_yaml(
        helm(
            chart_path,
            values=values_path,
            namespace=namespace,
            name=service_name,
        )
    )

# Deploy a Helm chart using Kustomize and optionally generate a local HTTPS link for the resource
def k8s_kustomize(path_to_dir, service_name, generate_link=False, flags=[]):
    # Deploy the Kustomize resource
    kustomized_yaml = kustomize(path_to_dir, flags=flags)
    k8s_yaml(kustomized_yaml)

    # If generate_link is enabled, construct and print the local HTTPS service URL
    if generate_link:
        service_url = "https://{}.localhost".format(service_name)
        print("Kustomize Deployment Completed for {}: {}".format(service_name, service_url))
        
        # Create a local Tilt resource for the link
        local_resource(
            "{}".format(service_name),
            cmd="echo Service available at {}".format(service_url),
            links=[service_url],  # Attach the link so it appears in the UI
            labels=["Flux"]
        )

        return service_url  # Return the link for potential use elsewhere
    else:
        print("Kustomize Deployment Completed for {} (no link required).".format(service_name))
        return None  # No link needed

# Deploy a remote Helm chart from a given repository URL
def remote_helm(service_name, repo_url, namespace, release_name, values):
    helm_remote(
        repo_name=service_name,
        repo_url=repo_url,
        values=values,  # a string or a list of values files
        namespace=namespace,
        release_name=release_name,
        chart=service_name,
    )

# Build and deploy a .NET service
def dotnet_service(
    service_name,
    publish_folder="publish",
    host_port=80,
    container_port=80,
):
    build_context = "../{}".format(service_name)
    csproj_path = "{}/{}.csproj".format(build_context, service_name)
    publish_path = "{}/{}".format(build_context, publish_folder)
    service_name_lower = service_name.lower()
    local_resource_name = "{}-build".format(service_name_lower)
    k8s_yaml_path = "{}.yaml".format(service_name_lower)

    # Build the .NET project locally
    local_resource(
        local_resource_name,
        "dotnet publish {} -c Release -o {}".format(csproj_path, publish_path),
        ignore=[
            "{}/obj".format(build_context),
            "{}/bin".format(build_context),
            "{}/.vs".format(build_context),
            publish_path,
        ],
        deps=[build_context],
    )

    # Build the Docker image from the published output
    docker_build(
        service_name_lower,
        publish_path,
        dockerfile="{}/Dockerfile".format(build_context),
    )

    # Deploy the Kubernetes manifests
    k8s_yaml(k8s_yaml_path)
    k8s_resource(
        service_name_lower,
        port_forwards="{}:{}".format(host_port, container_port),
        resource_deps=[local_resource_name],
    )

# Manage Git repositories using the git_resource extension.
def checkout_git_resource(name, repo_url, ref="master", subpath=None):
    git_resource(
        name=name,
        repo=repo_url,
        ref=ref,
        subpath=subpath,
    )

# Helper to format additional environment variables for Kubernetes YAML
def format_additional_env_vars(vars_list):
    if not vars_list:
        return ""
    
    env_yaml_parts = []
    for var_def in vars_list:
        env_yaml_parts.append("        - name: {}".format(var_def['name']))
        if 'value' in var_def:
            env_yaml_parts.append("          value: \"{}\"".format(var_def['value']))
        elif 'valueFrom' in var_def:
            # Simplified for secretKeyRef, extend if other valueFrom types are needed
            secret_ref = var_def['valueFrom']['secretKeyRef']
            env_yaml_parts.append("          valueFrom:")
            env_yaml_parts.append("            secretKeyRef:")
            env_yaml_parts.append("              name: {}".format(secret_ref['name']))
            env_yaml_parts.append("              key: {}".format(secret_ref['key']))
    return "\n" + "\n".join(env_yaml_parts) if env_yaml_parts else ""

# Deploy a containerized application using a Dockerfile
def deploy_container_app(
    service_name,
    build_context=".",
    dockerfile="Dockerfile",
    host_port=8000,
    container_port=8000,
    namespace="default",
    resources={},
    use_https=False,
    additional_env_vars=None  # New parameter
):
    service_name_lower = service_name.lower()
    
    # Build the Docker image
    docker_build(
        service_name_lower,
        context=build_context,
        dockerfile=dockerfile
    )
    
    additional_env_vars_yaml = format_additional_env_vars(additional_env_vars if additional_env_vars else [])

    # Create Kubernetes YAML for the deployment and service
    # Added {8} as a placeholder for additional_env_vars_yaml
    yaml_str = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {0}
  namespace: {1}
  labels:
    app: {0}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {0}
  template:
    metadata:
      labels:
        app: {0}
    spec:
      containers:
      - name: {0}
        image: {0}
        ports:
        - containerPort: {2}
        resources:
          requests:
            cpu: {3}
            memory: {4}
          limits:
            cpu: {5}
            memory: {6}
        env:
        - name: APP_HOST
          value: "{0}.localhost"
        - name: APP_PORT
          value: "{2}"
{8}
---
apiVersion: v1
kind: Service
metadata:
  name: {0}
  namespace: {1}
  labels:
    app: {0}
spec:
  ports:
  - port: {2}
    targetPort: {2}
    protocol: TCP
  selector:
    app: {0}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {0}
  namespace: {1}
  annotations:
    kubernetes.io/ingress.class: traefik
    traefik.ingress.kubernetes.io/router.entrypoints: {7}
spec:
  rules:
  - host: "{0}.localhost"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {0}
            port:
              number: {2}
  tls:
  - hosts:
    - "{0}.localhost"
    secretName: wildcard-tls-dev
""".format(
    service_name_lower, 
    namespace, 
    container_port,
    resources.get("request_cpu", "100m"),
    resources.get("request_memory", "128Mi"),
    resources.get("limit_cpu", "500m"),
    resources.get("limit_memory", "512Mi"),
    "websecure" if use_https else "web",
    additional_env_vars_yaml  # New argument for format
)
    
    # Apply the Kubernetes YAML
    k8s_yaml(blob(yaml_str))
    
    # Create a resource mapping for this service
    k8s_resource(
        service_name_lower,
        port_forwards=["{}:{}".format(host_port, container_port)],
        labels=["document-analyzer"]
    )
    
    # Return the URL for the deployed application
    protocol = "https" if use_https else "http"
    app_url = "{}://{}.localhost".format(protocol, service_name_lower)
    print("{} is available at: {}".format(service_name, app_url))
    
    # Create a local resource for the URL
    local_resource(
        "{}-url".format(service_name_lower),
        cmd="echo Service available at {}".format(app_url),
        links=[app_url],
        labels=["document-analyzer"]
    )
    
    return service_name_lower

###############################################################################
# DREAMREALM-SCP APPLICATION DEPLOYMENT
###############################################################################
# Create Kubernetes namespaces
k8s_namespace("flux")
k8s_namespace("traefik")
k8s_namespace("dreamrealm-scp")
k8s_namespace("document-analyzer")

# Apply secrets
k8s_yaml('k8s/mock-auth-secrets.yaml')
k8s_yaml('k8s/secrets.yaml')  # Add this line to apply document-analyzer-secrets

# Create certificates via a local script
certificate_creation("dev")

# Install Flux (if needed)
install_flux("dev")

# Deploy Traefik as ingress controller
remote_helm(
    service_name="traefik",
    repo_url="https://helm.traefik.io/traefik",
    values="./helm/traefik.yaml",
    namespace="traefik",
    release_name="traefik",
)

# Backend build task
local_resource(
    name="document-analyzer-backend-build",
    cmd="docker build -t document-analyzer-backend ./backend",
    deps=["./backend"],
    labels=["document-analyzer"]
)

# Backend deploy task
backend_additional_env_vars = [
    {'name': 'AZURE_FUNCTIONS_ENVIRONMENT', 'valueFrom': {'secretKeyRef': {'name': 'document-analyzer-secrets', 'key': 'AZURE_FUNCTIONS_ENVIRONMENT'}}},
    {'name': 'COSMOSDB_CONNECTION', 'valueFrom': {'secretKeyRef': {'name': 'document-analyzer-secrets', 'key': 'COSMOSDB_CONNECTION'}}},
    {'name': 'AZURE_OPENAI_ENDPOINT', 'valueFrom': {'secretKeyRef': {'name': 'document-analyzer-secrets', 'key': 'AZURE_OPENAI_ENDPOINT'}}},
    {'name': 'AZURE_OPENAI_API_KEY', 'valueFrom': {'secretKeyRef': {'name': 'document-analyzer-secrets', 'key': 'AZURE_OPENAI_API_KEY'}}},
    {'name': 'APPLICATIONINSIGHTS_CONNECTION_STRING', 'valueFrom': {'secretKeyRef': {'name': 'document-analyzer-secrets', 'key': 'APPLICATIONINSIGHTS_CONNECTION_STRING'}}}
]

deploy_container_app(
    service_name="document-analyzer-backend",
    build_context="./backend",
    dockerfile="./backend/Dockerfile",
    host_port=7071,
    container_port=80,
    namespace="document-analyzer",
    resources={
        "request_cpu": "200m",
        "request_memory": "256Mi",
        "limit_cpu": "500m",
        "limit_memory": "512Mi"
    },
    use_https=True,
    additional_env_vars=backend_additional_env_vars  # Pass the backend env vars here
)

# Frontend build task
local_resource(
    name="document-analyzer-frontend-build",
    # This build will use the default mock ARGs from the Dockerfile
    cmd="docker build -t document-analyzer-frontend ./frontend/document-analyzer",
    deps=["./frontend/document-analyzer", "./frontend/document-analyzer/public/index.html"], # Added index.html as a dep
    labels=["document-analyzer"]
)

# Frontend deploy task
# Define additional environment variables for the frontend deployment
frontend_additional_env_vars = [
    {'name': 'REACT_APP_AZURE_CLIENT_ID', 'valueFrom': {'secretKeyRef': {'name': 'mock-auth-config', 'key': 'clientID'}}},
    {'name': 'REACT_APP_AZURE_AUTHORITY', 'valueFrom': {'secretKeyRef': {'name': 'mock-auth-config', 'key': 'authority'}}},
    {'name': 'REACT_APP_USE_MOCK_AUTH', 'value': 'true'} # Added for fake auth mode
]

deploy_container_app(
    service_name="document-analyzer",  # Changed from "document-analyzer-frontend"
    build_context="./frontend/document-analyzer",
    dockerfile="./frontend/document-analyzer/Dockerfile",
    host_port=3000,
    container_port=80,
    namespace="document-analyzer",
    resources={
        "request_cpu": "100m",
        "request_memory": "128Mi",
        "limit_cpu": "300m",
        "limit_memory": "256Mi"
    },
    use_https=True,
    additional_env_vars=frontend_additional_env_vars # Pass the new env vars here
)