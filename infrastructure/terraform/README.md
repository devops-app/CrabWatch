# Terraform Configuration

> **LEGACY — NOT IN USE.** CrabWatch uses manual Azure CLI deployment via [`Azure-Deployment-Plan.md`](../../Azure-Deployment-Plan.md). These files are scaffolding from an earlier design and are not part of the current deployment process.

## Overview

Terraform manages the cloud infrastructure for CrabWatch on Azure.

## Prerequisites

- Terraform >= 1.5
- Azure CLI authenticated (`az login`)
- Service Principal with Contributor role on the target subscription

## Setup

1. Install Terraform: https://developer.hashicorp.com/terraform/install

2. Authenticate with Azure:
   ```bash
   az login
   az account set --subscription "YOUR_SUBSCRIPTION_ID"
   ```

3. Create service principal (one-time):
   ```bash
   az ad sp create-for-rbac --name "crabwatch-terraform" --role Contributor --scopes /subscriptions/YOUR_SUBSCRIPTION_ID
   ```

4. Copy and configure environment files:
   ```bash
   cp .terraformvars.example terraform.tfvars
   cp backend.tfvars.example backend.tfvars
   cp production.tfvars.example production.tfvars
   ```

5. Initialize Terraform:
   ```bash
   terraform init
   ```

## Configuration Files

- `terraform.tfvars` - Variable values for current environment
- `backend.tfvars` - Backend storage configuration (Azure Storage account)
- `production.tfvars` - Production-specific overrides

## Deploy

```bash
# Plan changes
terraform plan -var-file=terraform.tfvars

# Apply changes
terraform apply -var-file=terraform.tfvars
```

## Destroy

```bash
terraform destroy -var-file=terraform.tfvars
```

## State Management

State is stored in Azure Blob Storage for team collaboration. Configure the backend in `backend.tfvars`:

```hcl
storage_account_name = "crabwatchterraform"
container_name       = "terraform-state"
key                  = "crabwatch.tfstate"
```

## Resources Managed

- Resource Group
- App Service Plan
- Web App (Next.js frontend)
- App Service (Node.js API backend)
- PostgreSQL Flexible Server
- Redis Cache
- Application Insights
- Storage Account (blob uploads)
- Key Vault (secrets)
