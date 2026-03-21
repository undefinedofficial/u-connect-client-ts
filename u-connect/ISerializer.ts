import { decode, encode } from "@msgpack/msgpack";
import type { PackageClient, PackageServer } from "./DataType";
/**
 * Interface for serializing and deserializing data
 */
export interface ISerializer {
  /**
   * Serializes data to a format suitable for transport
   * @param data Data to serialize
   * @returns Serialized data
   */
  serialize<TPayload>(data: PackageClient<TPayload>): any;

  /**
   * Deserializes data from transport format
   * @param data Serialized data to deserialize
   * @returns Deserialized data
   */
  deserialize<TPayload>(data: any): PackageServer<TPayload>;
}

/**
 * Default MessagePack serializer implementation
 */
export class MessagePackSerializer implements ISerializer {
  serialize<TPayload>({ id, method, type, request, meta }: PackageClient<TPayload>) {
    return encode([id, method, type, request || null, meta || null]);
  }

  deserialize<TPayload>(message: any) {
    const [id, method, type, response, status, meta, error] = decode(message) as any;

    return { id, method, type, status, response, meta, error } as PackageServer<TPayload>;
  }
}
