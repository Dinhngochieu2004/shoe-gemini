import fs from 'fs';

const readSecret = (secretName: string, envFallback: string): string | undefined => {
    try {
        return fs.readFileSync(`/run/secrets/${secretName}`, 'utf8').trim();
    } catch {
        return process.env[envFallback];
    }
};

export default readSecret;
