export interface StoragePort {
  putObject(key: string, body: Buffer | Uint8Array | string): Promise<void>;
}
