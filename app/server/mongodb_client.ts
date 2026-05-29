import { Collection, Db, MongoClient } from "mongodb";
import type { SerializedAppState } from "../state/app_state";

type StoredResumeStateDocument = {
  _id: string;
  stateBlob: SerializedAppState;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_DB_NAME = "resume_assistant";
const DEFAULT_COLLECTION_NAME = "resume_state_json";

export default class MongoDbClient {
  private static instance: MongoDbClient | null = null;
  private static mongoClientPromise: Promise<MongoClient> | null = null;

  private readonly mongoUri: string;
  private readonly dbName: string;
  private readonly collectionName: string;

  private logInfo(method: string, message: string, details?: Record<string, unknown>) {
    if (details) {
      console.info(`[MongoDbClient.${method}] ${message}`, details);
      return;
    }

    console.info(`[MongoDbClient.${method}] ${message}`);
  }

  private logError(
    method: string,
    message: string,
    error: unknown,
    details?: Record<string, unknown>,
  ) {
    if (error instanceof Error) {
      console.error(`[MongoDbClient.${method}] ${message}`, {
        ...details,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
      });
      return;
    }

    console.error(`[MongoDbClient.${method}] ${message}`, {
      ...details,
      error,
    });
  }

  private constructor() {
    this.mongoUri = process.env.MONGODB_URI ?? "";
    this.dbName = process.env.MONGODB_DB ?? DEFAULT_DB_NAME;
    this.collectionName =
      process.env.MONGODB_STATE_COLLECTION ?? DEFAULT_COLLECTION_NAME;

    this.logInfo("constructor", "Initializing Mongo client config", {
      hasMongoUri: Boolean(this.mongoUri),
      dbName: this.dbName,
      collectionName: this.collectionName,
    });

    if (!this.mongoUri) {
      this.logError("constructor", "Missing required Mongo URI", "MONGODB_URI is empty");
      throw new Error("MONGODB_URI is not configured.");
    }
  }

  public static getInstance(): MongoDbClient {
    if (!MongoDbClient.instance) {
      console.info("[MongoDbClient.getInstance] Creating singleton instance");
      MongoDbClient.instance = new MongoDbClient();
    } else {
      console.info("[MongoDbClient.getInstance] Reusing singleton instance");
    }

    return MongoDbClient.instance;
  }

  private async getMongoClient(): Promise<MongoClient> {
    if (!MongoDbClient.mongoClientPromise) {
      this.logInfo("getMongoClient", "Creating new MongoClient connection promise");
      MongoDbClient.mongoClientPromise = new MongoClient(this.mongoUri).connect();
    } else {
      this.logInfo("getMongoClient", "Using existing MongoClient connection promise");
    }

    try {
      const client = await MongoDbClient.mongoClientPromise;
      this.logInfo("getMongoClient", "MongoClient connection ready");
      return client;
    } catch (error) {
      this.logError("getMongoClient", "Failed to establish MongoClient connection", error);
      throw error;
    }
  }

  private async getCollection(): Promise<Collection<StoredResumeStateDocument>> {
    this.logInfo("getCollection", "Resolving collection handle", {
      dbName: this.dbName,
      collectionName: this.collectionName,
    });

    try {
      const client = await this.getMongoClient();
      const db: Db = client.db(this.dbName);
      const collection = db.collection<StoredResumeStateDocument>(this.collectionName);
      this.logInfo("getCollection", "Collection handle resolved", {
        dbName: this.dbName,
        collectionName: this.collectionName,
      });
      return collection;
    } catch (error) {
      this.logError("getCollection", "Failed to resolve collection handle", error, {
        dbName: this.dbName,
        collectionName: this.collectionName,
      });
      throw error;
    }
  }

  private assertValidIdentityKey(identityKey: string): string {
    const trimmed = identityKey.trim();
    if (!trimmed) {
      this.logError(
        "assertValidIdentityKey",
        "identityKey validation failed",
        "identityKey is empty",
      );
      throw new Error("identityKey is required.");
    }

    this.logInfo("assertValidIdentityKey", "identityKey validated", {
      identityKeyLength: trimmed.length,
    });

    return trimmed;
  }

  public async saveExportedState(
    identityKey: string,
    stateBlob: SerializedAppState,
  ): Promise<void> {
    this.logInfo("saveExportedState", "Saving state blob");

    try {
      const tokenKey = this.assertValidIdentityKey(identityKey);
      const collection = await this.getCollection();
      const now = new Date();

      const result = await collection.updateOne(
        { _id: tokenKey },
        {
          $set: {
            stateBlob,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true },
      );

      this.logInfo("saveExportedState", "State blob saved", {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId ? String(result.upsertedId) : null,
      });
    } catch (error) {
      this.logError("saveExportedState", "Failed to save state blob", error);
      throw error;
    }
  }

  public async loadExportedState(
    identityKey: string,
  ): Promise<SerializedAppState | null> {
    this.logInfo("loadExportedState", "Loading state blob");

    try {
      const tokenKey = this.assertValidIdentityKey(identityKey);
      const collection = await this.getCollection();

      const document = await collection.findOne(
        { _id: tokenKey },
        { projection: { stateBlob: 1 } },
      );

      this.logInfo("loadExportedState", "State blob load completed", {
        found: Boolean(document?.stateBlob),
      });
      return document?.stateBlob ?? null;
    } catch (error) {
      this.logError("loadExportedState", "Failed to load state blob", error);
      throw error;
    }
  }

  public async deleteExportedState(identityKey: string): Promise<void> {
    this.logInfo("deleteExportedState", "Deleting state blob");

    try {
      const tokenKey = this.assertValidIdentityKey(identityKey);
      const collection = await this.getCollection();
      const result = await collection.deleteOne({ _id: tokenKey });

      this.logInfo("deleteExportedState", "State blob delete completed", {
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      this.logError("deleteExportedState", "Failed to delete state blob", error);
      throw error;
    }
  }
}
