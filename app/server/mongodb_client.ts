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

  private constructor() {
    this.mongoUri = process.env.MONGODB_URI ?? "";
    this.dbName = process.env.MONGODB_DB ?? DEFAULT_DB_NAME;
    this.collectionName =
      process.env.MONGODB_STATE_COLLECTION ?? DEFAULT_COLLECTION_NAME;

    if (!this.mongoUri) {
      throw new Error("MONGODB_URI is not configured.");
    }
  }

  public static getInstance(): MongoDbClient {
    if (!MongoDbClient.instance) {
      MongoDbClient.instance = new MongoDbClient();
    }

    return MongoDbClient.instance;
  }

  private async getMongoClient(): Promise<MongoClient> {
    if (!MongoDbClient.mongoClientPromise) {
      MongoDbClient.mongoClientPromise = new MongoClient(this.mongoUri).connect();
    }

    return MongoDbClient.mongoClientPromise;
  }

  private async getCollection(): Promise<Collection<StoredResumeStateDocument>> {
    const client = await this.getMongoClient();
    const db: Db = client.db(this.dbName);
    return db.collection<StoredResumeStateDocument>(this.collectionName);
  }

  private assertValidIdentityKey(identityKey: string): string {
    const trimmed = identityKey.trim();
    if (!trimmed) {
      throw new Error("identityKey is required.");
    }

    return trimmed;
  }

  public async saveExportedState(
    identityKey: string,
    stateBlob: SerializedAppState,
  ): Promise<void> {
    const tokenKey = this.assertValidIdentityKey(identityKey);
    const collection = await this.getCollection();
    const now = new Date();

    await collection.updateOne(
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
  }

  public async loadExportedState(
    identityKey: string,
  ): Promise<SerializedAppState | null> {
    const tokenKey = this.assertValidIdentityKey(identityKey);
    const collection = await this.getCollection();

    const document = await collection.findOne(
      { _id: tokenKey },
      { projection: { stateBlob: 1 } },
    );

    return document?.stateBlob ?? null;
  }

  public async deleteExportedState(identityKey: string): Promise<void> {
    const tokenKey = this.assertValidIdentityKey(identityKey);
    const collection = await this.getCollection();
    await collection.deleteOne({ _id: tokenKey });
  }
}
