import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../Config/redis';
import UserModel from '../models/User';
import readSecret from '../utils/secret';
import { JwtUserPayload } from '../types/index';

const middlewareController = {
    verifyToken: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { authorization } = req.headers;
            if (!authorization) {
                res.status(403).json('Authentication require');
                return;
            }

            const accessToken = authorization.split(' ')[1];

            const dirtyToken = await redisClient.get(accessToken);
            if (dirtyToken) {
                res.status(401).json('token expired');
                return;
            }

            jwt.verify(
                accessToken,
                readSecret('jwt_access_key', 'JWT_ACCESS_KEY') as string,
                (error, decoded) => {
                    if (error) {
                        if (error.name === 'TokenExpiredError') {
                            res.status(401).json('token expired !');
                            return;
                        }
                        res.status(402).json('Authentication require !');
                        return;
                    }
                    req.accessToken = accessToken;
                    req.user = decoded as JwtUserPayload;
                    next();
                }
            );
        } catch (error) {
            res.status(400).json(error);
        }
    },

    verifyTokenAdmin: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { authorization } = req.headers;
            if (!authorization) {
                res.status(403).json('Authentication require');
                return;
            }

            const accessToken = authorization.split(' ')[1];

            const dirtyToken = await redisClient.get(accessToken);
            if (dirtyToken) {
                res.status(401).json('token expired');
                return;
            }

            jwt.verify(
                accessToken,
                readSecret('jwt_access_key', 'JWT_ACCESS_KEY') as string,
                async (error, decoded) => {
                    if (error) {
                        if (error.name === 'TokenExpiredError') {
                            res.status(401).json('token expired');
                            return;
                        }
                        res.status(402).json('Authentication require');
                        return;
                    }

                    req.accessToken = accessToken;
                    req.user = decoded as JwtUserPayload;

                    const findUser = await UserModel.findOne({ email: (decoded as JwtUserPayload).email });
                    if (findUser && findUser.isAdmin === true) {
                        next();
                    } else {
                        res.status(403).json({ message: 'Bạn Không Có Quyền Thao Tác !!!' });
                    }
                }
            );
        } catch (error) {
            res.status(400).json(error);
        }
    },
};

export default middlewareController;
