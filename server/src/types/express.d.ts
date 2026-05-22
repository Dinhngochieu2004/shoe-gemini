import 'express'  
declare global {
    namespace Express {
        interface Request {
            user?: {
                email: string;
                admin: boolean;
                iat: number;
                exp: number;
            };
            accessToken?: string;
        }
    }
}
