import dotenv from 'dotenv';
import { createClient } from 'redis';
import fs from 'fs';

dotenv.config();

const readSecret = (secretName: string): string | undefined => {
    try {
        return fs.readFileSync(`/run/secrets/${secretName}`, 'utf8').trim();
    } catch {
        return process.env.CONNECT_REDIS;
    }
};

const client = createClient({
    url: readSecret('redis_uri'),
});

client.on('error', (error: Error) =>
    console.error(`[${new Date().toISOString()}] Redis client error:`, error.message)
);

const connectionRedis = (): Promise<void> => {
    return client
        .connect()
        .then(() => console.log('Redis Connected!'))
        .catch((error: Error) => console.error('Redis connection failed:', error.message));
};

export { connectionRedis, client as redisClient };
