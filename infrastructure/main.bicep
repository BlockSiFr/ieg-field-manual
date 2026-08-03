@description('Environment name: dev | staging | prod')
param environment string

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name prefix respecting Azure constraints')
param namePrefix string = 'blocksifrdastor'

@description('Custom hostname for Static Web App (optional)')
param customDomainName string = 'dastor.blocksifr.com'

@description('Deploy Front Door readiness resources')
param enableFrontDoor bool = false

var suffix = environment
var swaName = 'swa-${namePrefix}-${suffix}'
var storageName = take(replace('st${namePrefix}${suffix}', '-', ''), 24)
var kvName = take('kv-${namePrefix}-${suffix}', 24)
var appiName = 'appi-${namePrefix}-${suffix}'
var lawName = 'law-${namePrefix}-${suffix}'
var funcName = take('func-${namePrefix}-${suffix}', 60)

resource law 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: lawName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: appiName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: law.id
    IngestionMode: 'LogAnalytics'
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource samples 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/dastor-samples'
  properties: { publicAccess: 'None' }
}

resource manual 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/dastor-manual-protected'
  properties: { publicAccess: 'None' }
}

resource tables 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = {
  name: '${storage.name}/default/dastorLeads'
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: location
  sku: { name: 'Standard', tier: 'Standard' }
  properties: {
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

output staticWebAppName string = swa.name
output staticWebAppDefaultHostname string = swa.properties.defaultHostname
output storageAccountName string = storage.name
output keyVaultName string = kv.name
output appInsightsConnectionString string = appi.properties.ConnectionString
output customDomainReminder string = 'Configure ${customDomainName} on SWA or Front Door after deployment; see reports/DNS_DEPLOYMENT_INSTRUCTIONS.md'
output frontDoorEnabled bool = enableFrontDoor
output functionAppSuggestedName string = funcName
