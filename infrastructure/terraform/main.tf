terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
}

resource "azurerm_resource_group" "crabwatch" {
  name     = "crabwatch-${var.environment}"
  location = var.location
  tags = {
    Project   = "CrabWatch"
    Environment = var.environment
  }
}

resource "azurerm_storage_account" "crabwatch" {
  name                     = "crabwatch${var.environment}${random_id.storage_suffix.hex}"
  resource_group_name      = azurerm_resource_group.crabwatch.name
  location                 = azurerm_resource_group.crabwatch.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
  tags = {
    Project = "CrabWatch"
  }
}

resource "azurerm_storage_container" "uploads" {
  name                  = "crabwatch-uploads"
  storage_account_name  = azurerm_storage_account.crabwatch.name
  container_access_type = "private"
}

resource "azurerm_function_app" "crabwatch" {
  name                       = "crabwatch-api-${var.environment}"
  resource_group_name        = azurerm_resource_group.crabwatch.name
  location                   = azurerm_resource_group.crabwatch.location
  os_type                    = "linux"
  storage_account_name       = azurerm_storage_account.crabwatch.name
  storage_account_access_key = azurerm_storage_account.crabwatch.primary_access_key
  version                    = "~4"
  runtime_version            = 18
  runtime_stack              = "node"
  tags = {
    Project = "CrabWatch"
  }

  site_config {
    application_stack {
      node_version = "18"
    }
    always_on = true
  }

  app_settings = {
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
    WEBSITE_RUN_FROM_PACKAGE       = "1"
    AzureWebJobsStorage            = azurerm_storage_account.crabwatch.primary_connection_string
    AZURE_STORAGE_CONNECTION_STRING = azurerm_storage_account.crabwatch.primary_connection_string
    AZURE_STORAGE_CONTAINER        = azurerm_storage_container.uploads.name
  }
}

resource "azurerm_static_web_app" "crabwatch" {
  name                = "crabwatch-web-${var.environment}"
  resource_group_name = azurerm_resource_group.crabwatch.name
  location            = azurerm_resource_group.crabwatch.location
  tags = {
    Project = "CrabWatch"
  }
}

resource "random_id" "storage_suffix" {
  byte_length = 2
}
