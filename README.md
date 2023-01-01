# FTTS-PAYMENTS-SAP-SFTP-PUSH

## Getting Started

Project is based on Node.js and Azure Functions.

### Dependencies

- Node.js installed on local machine (v16.18.1) https://nodejs.org/en/
- The following packages may need to be installed globally (`npm install -g`) to avoid errors:
- azure-functions-core-tools@3.0.2245
- azurite https://github.com/Azure/Azurite
### Settings

Create local-settings.json file in the project root by running `npm run copy-config`

## Local storage

To run SFTP Push app on local machine you can use storage emulator or point to the deployed sapfilestor.

On Windows it can be Azure Storage Emulator https://docs.microsoft.com/en-us/azure/storage/common/storage-use-emulator

On Mac OS or Linux you can use Azurite https://github.com/Azure/Azurite. Use the VSCode Azurite extension and launch 'Blob Service'.
Alternatively use Docker:

```bash
docker pull mcr.microsoft.com/azure-storage/azurite
```

and then

```bash
docker run -p 10000:10000 -p 10001:10001 mcr.microsoft.com/azure-storage/azurite
```

## Testing on local environment

### 1. Launch DNS and SFTP servers

Outside application directory:

```bash
mkdir dnsmasq
cd dnsmasq
touch dnsmasq.conf
touch docker-compose.yml
```

Next edit `dnsmasq.conf` and put

```bash
#log all dns queries
log-queries
#dont use hosts nameservers
no-resolv
#use google as default nameservers
server=8.8.4.4
server=8.8.8.8
#explicitly define host-ip mappings
address=/sftp_server/127.0.0.1
```

It will translate `sftp_server` into `127.0.0.1`.

Next edit `docker-compose.yml` and put:

```yml
version: '2'
services:
  dns:
    restart: always
    image: strm/dnsmasq
    volumes:
      - ./dnsmasq.conf:/etc/dnsmasq.conf
    ports:
      - "53:53/udp"
    cap_add:
      - NET_ADMIN
  sftp:
    image: atmoz/sftp
    ports:
      - "22:22"
    command: foo:pass:::upload
```

Next launch dnsmasq and sftp:

```bash
docker-compose up
```
Credentials to local SFTP:
- user: foo
- password: pass

### 2. Configure `ftts-payments-sap-sftp-push` application

Run `npm run copy-config`

This config will point to local SFTP and DNS.

It will configure application with local blob storage, blob name: `bbb`.

### 3. Run application

```bash
npm install
npm run start
```

### 4. Put file to Azure blob

Launch Microsoft Azure Storage Explorer/Azurite, connect to local storage, create `bbb` blob and upload some file.

Alternatively if you have trouble trying to use Storage Explorer/Azurite locally, you can just use the deployed `sapfilestor` (via sap-release-pipeline), create a new container `bbb` and upload your file there. (And point the local.settings.json connection string to the deployed blob store.)

### 5. Within one minute new file should appear in your local SFTP

Check on Mac OS:

```bash
sftp foo@localhost
```

Password = `pass`

In case of `Host key verification failed` you can remove old fingerprint by

```bash
ssh-keygen -R localhost
```

After connection, in `sftp` console cd to the `upload` folder:

```bash
ls -l
```

Uploaded file should be listed.

To force reprocessing of a blob, delete the blob receipt for that blob from the azure-webjobs-hosts container manually. While reprocessing might not occur immediately, it's guaranteed to occur at a later point in time. To reprocess immediately, the scaninfo blob in azure-webjobs-hosts/blobscaninfo can be updated. Any blobs with a last modified timestamp after the LatestScan property will be scanned again.

Detailed documentation - https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger?tabs=csharp#blob-receipts

### 6. Failed Upload Notifier

In terms of error, Azure will retry based on maxDequeueCount parameter in the host.json file. 
After that the message will be moved to the poison queue 'webjobs-blobtrigger-poison' and Failed Upload Notifier function will be triggered to log proper event.

## Roles validation

Roles validation is enabled by default on all environmemnts. It can be disabled by setting ROLES_VALIDATION environment variable (boolean).

## Healthcheck HTTP endpoint

Payments SAP SFTP Push healthcheck function is a troubleshooting/support function to check connectivity with specific components used by application

GET <payments-sap-sftp-push-url>/api/<version>/healthcheck - e.g. /api/v1/healthcheck

Responses:

- HTTP 200 (connections OK)

- HTTP 503 with response body containing specific errors details:

```json
{
  "status": "Service unavailable",
  "errors": [
    {
      "component": "<COMPONENT_NAME>",
      "message": "<ERROR_MESSAGE>",
    }
  ]
}
```

- HTTP 500 with response body containing error message

Documentation - https://wiki.dvsacloud.uk/pages/viewpage.action?spaceKey=FB&title=Health+Checks