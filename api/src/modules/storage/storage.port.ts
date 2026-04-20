export interface StoragePort {
  putObject(
    key: string,
    body: Buffer | Uint8Array | string,
    options?: {
      contentType?: string;
    },
  ): Promise<void>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Presigned PUT URL for browser uploads (e.g. CMS asset library). */
  getSignedPutUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<string>;
}
