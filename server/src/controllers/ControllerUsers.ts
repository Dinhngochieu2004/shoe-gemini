import dotenv from 'dotenv';
import { Request, Response } from 'express';
import UserModel from '../models/User';
import TokenModel from '../models/Token';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jwtDecode } from 'jwt-decode';
import PaymentModel from '../models/Payment';
import ForgotPassword from '../SendMail/ForgotPassword';
import { redisClient } from '../Config/redis';
import readSecret from '../utils/secret';
import { JwtUserPayload } from '../types/index';

dotenv.config();

const generateAccessToken = async (user: { email: string; isAdmin: boolean }): Promise<string> => {
    return jwt.sign(
        { email: user.email, admin: user.isAdmin },
        readSecret('jwt_access_key', 'JWT_ACCESS_KEY') as string,
        { expiresIn: '15m' }
    );
};

const generateRefreshToken = async (user: { email: string; isAdmin: boolean }): Promise<string> => {
    return jwt.sign(
        { email: user.email, admin: user.isAdmin },
        readSecret('jwt_refresh_key', 'JWT_REFRESH_KEY') as string,
        { expiresIn: '1h' }
    );
};

const setTokenBlacklist = async (token: string): Promise<void> => {
    const decoded = jwtDecode<{ exp: number }>(token);
    if (decoded.exp > Date.now() / 1000) {
        await redisClient.set(token, token, { EXAT: decoded.exp });
    }
};

const ControllerUser = {
    Register: async (req: Request, res: Response): Promise<Response> => {
        try {
            const { fullname, password, email, phone } = req.body as {
                fullname: string;
                password: string;
                email: string;
                phone: number;
            };

            if (!fullname || !email || !password || !phone) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Hãy nhập các trường: fullname, email, password, phone',
                });
            }

            const existingUser = await UserModel.findOne({ email });
            if (existingUser) {
                return res.status(401).json({ status: 'error', message: 'Email đã tồn tại' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new UserModel({ fullname, password: hashedPassword, email, phone });
            await newUser.save();

            return res.status(200).json({ status: 'successfully', message: 'Đăng ký thành công !!!' });
        } catch (error) {
            return res.status(500).json(error);
        }
    },

    Login: async (req: Request, res: Response): Promise<Response> => {
        try {
            const { email, password } = req.body as { email: string; password: string };

            const dataUser = await UserModel.findOne({ email });
            if (!dataUser) return res.status(400).json('Email không hợp lệ');

            const isPassword = await bcrypt.compare(password, dataUser.password);
            if (!isPassword) return res.status(400).json('Mật khẩu không hợp lệ');

            const accessToken = await generateAccessToken(dataUser);
            const refreshToken = await generateRefreshToken(dataUser);

            const isToken = await TokenModel.findOne({ usersId: dataUser._id });
            if (isToken) {
                await setTokenBlacklist(isToken.accessToken);
                await setTokenBlacklist(isToken.refreshToken);
                await TokenModel.deleteOne({ usersId: dataUser._id });
            }

            await new TokenModel({ usersId: dataUser._id, accessToken, refreshToken }).save();

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            const { password: _, ...others } = dataUser.toObject();
            return res.status(200).json({ user: others, accessToken });
        } catch (error) {
            return res.status(400).json(error);
        }
    },

    RefreshToken: async (req: Request, res: Response): Promise<void> => {
        try {
            const { refreshToken } = req.cookies as { refreshToken?: string };
            if (!refreshToken) { res.status(401).json('Authentication required'); return; }

            const dirtyToken = await redisClient.get(refreshToken);
            if (dirtyToken) { res.status(401).json('token expired'); return; }

            const secret = readSecret('jwt_refresh_key', 'JWT_REFRESH_KEY') as string;
            try {
                const decoded = jwt.verify(refreshToken, secret) as { email: string; isAdmin: boolean };
                const newAccessToken = await generateAccessToken(decoded);
                await TokenModel.updateOne({ refreshToken }, { $set: { accessToken: newAccessToken } });
                res.status(200).json({ accessToken: newAccessToken });
            } catch {
                res.status(403).json('token không hợp lệ');
            }
        } catch (error) {
            res.status(500).json(error);
        }
    },

    Logout: async (req: Request, res: Response): Promise<Response> => {
        try {
            const accessToken = req.accessToken as string;
            const isToken = await TokenModel.findOne({ accessToken });
            if (!isToken) return res.status(404).json('Token không tồn tại');
            await setTokenBlacklist(isToken.accessToken);
            await setTokenBlacklist(isToken.refreshToken);
            await TokenModel.deleteOne({ accessToken });
            return res.status(200).json('Đăng xuất thành công !!!');
        } catch (error) {
            return res.status(500).json(error);
        }
    },

    GetUser: async (req: Request, res: Response): Promise<Response> => {
        try {
            const dataUser = await UserModel.findOne({ email: req.user!.email });
            if (!dataUser) return res.status(404).json('Không tìm thấy người dùng');
            return res.status(200).json(dataUser);
        } catch (error) {
            return res.status(500).json(error);
        }
    },

    GetOrder: async (req: Request, res: Response): Promise<Response> => {
        try {
            const data = await PaymentModel.find({});
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json(error);
        }
    },

    ForgotPassword: async (req: Request, res: Response): Promise<Response> => {
        try {
            const { email } = req.body as { email: string };
            const dataUser = await UserModel.findOne({ email });
            if (!dataUser) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng !!!' });
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const token = jwt.sign(
                { email, otp },
                readSecret('jwt_access_key', 'JWT_ACCESS_KEY') as string,
                { expiresIn: '15m' }
            );
            await ForgotPassword(email, token, otp);
            return res.status(200).json({ message: 'Gửi email thành công !!!' });
        } catch (error) {
            return res.status(500).json(error);
        }
    },

    ResetPassword: async (req: Request, res: Response): Promise<Response> => {
        try {
            const { token, otp, newPassword } = req.body as {
                token: string;
                otp: string;
                newPassword: string;
            };
            const decoded = jwt.verify(token, readSecret('jwt_access_key', 'JWT_ACCESS_KEY') as string) as {
                email: string;
                otp: string;
            };

            if (decoded.otp !== otp) {
                return res.status(401).json({ message: 'OTP không hợp lệ !!!' });
            }

            const hashPassword = await bcrypt.hash(newPassword, 10);
            await UserModel.updateOne({ email: decoded.email }, { password: hashPassword });

            return res.status(200).json({ message: 'Khôi phục mật khẩu thành công !!!' });
        } catch (error) {
            return res.status(500).json(error);
        }
    },

    getAllUser: async (req: Request, res: Response): Promise<Response> => {
        try {
            const data = await UserModel.find({});
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json(error);
        }
    },

    DeleteUser: async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.query as { id: string };
            const findUser = await UserModel.findOne({ _id: id });

            if (!findUser) return res.status(404).json({ message: 'Không tìm thấy người dùng !!!' });
            if (findUser.isAdmin === true) return res.status(400).json({ message: 'Không thể xóa Admin !!!' });

            await UserModel.deleteOne({ _id: id });
            return res.status(200).json({ message: 'Xóa người dùng thành công !!!' });
        } catch (error) {
            return res.status(500).json(error);
        }
    },
};

export default ControllerUser;
