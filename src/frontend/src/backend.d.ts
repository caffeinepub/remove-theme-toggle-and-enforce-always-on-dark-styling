import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface RecordingMetadata {
    id: string;
    name: string;
    description: string;
}
export interface Recording {
    owner: Principal;
    metadata: RecordingMetadata;
    measurements: ExternalBlob;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteRecording(id: string): Promise<void>;
    getAllRecordings(): Promise<Array<RecordingMetadata>>;
    getCallerUserRole(): Promise<UserRole>;
    getRecording(id: string): Promise<Recording>;
    isCallerAdmin(): Promise<boolean>;
    saveRecording(id: string, metadata: RecordingMetadata, measurements: ExternalBlob): Promise<void>;
}
