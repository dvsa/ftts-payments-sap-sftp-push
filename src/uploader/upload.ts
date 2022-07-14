/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import config from '../config';
import { BusinessTelemetryEvent, logger } from '../observability/logger';
import { newSftpClient } from '../sftp/newSFTPClient';

export default async function upload(
  fileName: string,
  fileContents: Buffer,
): Promise<void> {
  const destPath = `${config.sftp.path}${fileName}`;
  const logProperties = {
    fileName,
    size: fileContents.length,
    destPath,
  };
  logger.logEvent(
    BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STARTED,
    undefined,
    logProperties,
  );
  const sftpClient = await newSftpClient();
  try {
    await sftpClient.connect();
    await sftpClient.upload(fileContents, destPath);
    logger.logEvent(
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_SUCCESSFUL,
      'Upload successful',
      logProperties,
    );
    const exists = await sftpClient.fileExists(destPath);
    logger.logEvent(
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STATS,
      'File exists',
      {
        exists,
      },
    );
    if (exists) {
      const fileStats = await sftpClient.fileStats(destPath);
      logger.logEvent(
        BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STATS,
        'File stats',
        fileStats,
      );
    }
  } finally {
    await sftpClient.disconnect();
  }
}
