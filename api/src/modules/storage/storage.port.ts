export interface StoragePort {
  putObject(
    key: string,
    body: Buffer | Uint8Array | string,
    options?: {
      contentType?: string;
    },
  ): Promise<void>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
