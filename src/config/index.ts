export default {
  appName: process.env.APP_NAME || '',
  azureTenantId: process.env.AZURE_TENANT_ID || '',

  sftp: {
    dnsServer: process.env.SAP_SFTP_DNSSERVERIP || '',
    sftpHost: process.env.SAP_SFTP_HOSTNAME || '',
    sftpPort: process.env.SAP_SFTP_PORT || '',
    userName: process.env.SAP_SFTP_USERNAME || '',
    password: process.env.SAP_SFTP_PASSWORD || '',
    path: process.env.SAP_SFTP_PATH || '',
  },

  azureBlob: {
    storageConnectionString: process.env.SAP_INTEGRATION_FILE_STORAGE || '',
    containerName: process.env.AZURE_BLOB_CONTAINER_NAME || '',
  },

  security: {
    rolesValidation: process.env.ROLES_VALIDATION || 'true',
  },
};
