FROM mcr.microsoft.com/azure-functions/python:4-python3.9

# Set environment variables
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    PYTHONPATH=/home/site/wwwroot

# Copy requirements and install dependencies
COPY requirements.txt /home/site/wwwroot/

# Upgrade pip before installing requirements
RUN python -m pip install --upgrade pip

# Test PyPI access by installing a common package
RUN pip install requests

# Install dependencies
RUN pip install -vvv --no-cache-dir --index-url https://pypi.org/simple --trusted-host pypi.org -r /home/site/wwwroot/requirements.txt

# Copy function code
COPY . /home/site/wwwroot/

# Create necessary directories for Azure Functions
RUN mkdir -p /home/site/wwwroot/.python_packages

# Expose port for Azure Functions
EXPOSE 80

# Add default environment variables for local development
ENV AZURE_FUNCTIONS_ENVIRONMENT=Development \
    COSMOSDB_CONNECTION=Endpoint=sb://local-cosmos-endpoint:10255/;AccountKey=dummykey \
    AZURE_OPENAI_ENDPOINT=https://local-openai-endpoint.com

# Start Azure Functions host
# CMD ["/usr/local/bin/func", "start"] # Removed to allow base image to handle startup
