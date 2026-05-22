import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const readSecrets = (secretName: string): string | null => {
    try {
        return fs.readFileSync(`/run/secrets/${secretName}`, 'utf8').trim();
    } catch {
        return null;
    }
};

const connectDB = async (): Promise<void> => {
    try {
        const mongoUri = readSecrets('mongo_uri') ?? process.env.CONNECT_DB;

        if (!mongoUri) {
            throw new Error('CONNECT_DB is not defined');
        }

        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected!');
    } catch (error) {
        console.error('Failed to connect to MongoDB!', error);
        process.exit(1);
    }
};

export default connectDB;
