output "resource_group_name" {
  value = azurerm_resource_group.crabwatch.name
}

output "function_app_name" {
  value = azurerm_function_app.crabwatch.name
}

output "static_web_app_name" {
  value = azurerm_static_web_app.crabwatch.name
}

output "storage_account_name" {
  value = azurerm_storage_account.crabwatch.name
}

output "storage_container_name" {
  value = azurerm_storage_container.uploads.name
}
