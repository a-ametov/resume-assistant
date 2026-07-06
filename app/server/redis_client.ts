import { createClient, type RedisClientType } from 'redis';

export default class RedisClient {
    private static client: RedisClientType | null = null;
    private static connectPromise: Promise<RedisClientType> | null = null;

    private static buildClient(): RedisClientType {
        const parsedPort = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);

        const client = createClient({
            username: process.env.REDIS_USERNAME ?? '',
            password: process.env.REDIS_PASSWORD ?? '',
            socket: {
                host: process.env.REDIS_URL ?? '',
                port: Number.isFinite(parsedPort) ? parsedPort : 6379,
            },
        });

        client.on('error', (err) => {
            console.error('Redis Client Error', err);
        });

        return client;
    }

    private static async getClient(): Promise<RedisClientType> {
        if (this.client?.isOpen) {
            return this.client;
        }

        if (!this.connectPromise) {
            const client = this.client ?? this.buildClient();
            this.client = client;
            this.connectPromise = client.connect().then(() => client).finally(() => {
                this.connectPromise = null;
            });
        }

        return this.connectPromise;
    }

    private static secondsUntilNextMidnight(): number {
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setHours(24, 0, 0, 0);

        const seconds = Math.ceil((nextMidnight.getTime() - now.getTime()) / 1000);
        return Math.max(1, seconds);
    }

    public static async set(key: string, value: number): Promise<number> {
        try {
            const client = await this.getClient();
            const ttlSeconds = this.secondsUntilNextMidnight();
            await client.set(key, String(value), {
                EX: ttlSeconds,
            });
            return 0;
        } catch {
            return -1;
        }
    }

    public static async get(key: string): Promise<number> {
        try {
            const client = await this.getClient();
            const value = await client.get(key);

            if (value === null) {
                return 0;
            }

            const parsedValue = Number.parseInt(value, 10);
            return Number.isNaN(parsedValue) ? -1 : parsedValue;
        } catch {
            return -1;
        }
    }
}
