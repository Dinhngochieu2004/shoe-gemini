import { z } from 'zod';
import { Document, Types } from 'mongoose';

// ─── User ────────────────────────────────────────────────────────────────────

export const UserZodSchema = z.object({
    fullname: z.string().min(1, 'Họ tên không được để trống'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    isAdmin: z.boolean().default(false),
    phone: z.number().default(0),
});

export const RegisterSchema = z.object({
    fullname: z.string().min(1, 'Họ tên không được để trống'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    phone: z.number({ coerce: true }),
});

export const LoginSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export const ForgotPasswordSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
});

export const ResetPasswordSchema = z.object({
    token: z.string().min(1),
    otp: z.string().length(6, 'OTP phải có 6 chữ số'),
    newPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

export type IUserInput = z.infer<typeof UserZodSchema>;

export interface IUserDocument extends Document {
    fullname: string;
    email: string;
    password: string;
    isAdmin: boolean;
    phone: number;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export const ProductZodSchema = z.object({
    name: z.string().min(1, 'Tên sản phẩm không được để trống'),
    price: z.number({ coerce: true }).positive('Giá phải lớn hơn 0'),
    description: z.string().default(''),
    type: z.number({ coerce: true }).int().min(0).max(3),
    slug: z.string().optional(),
    img: z.array(z.string()).optional(),
});

export const AddProductSchema = z.object({
    nameProduct: z.string().min(1),
    priceProduct: z.string().or(z.number()),
    description: z.string().default(''),
    checkType: z.string().or(z.number()),
});

export const EditProductSchema = z.object({
    id: z.string().min(1),
    nameProduct: z.string().min(1),
    priceProduct: z.string().or(z.number()),
    description: z.string(),
});

export type IProductInput = z.infer<typeof ProductZodSchema>;

export interface IProductDocument extends Document {
    img: string[];
    name: string;
    price: number;
    slug: string;
    description: string;
    type: number;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export const CartItemZodSchema = z.object({
    nameProduct: z.string().min(1),
    quantity: z.number({ coerce: true }).int().positive(),
    price: z.number({ coerce: true }).positive(),
    size: z.number({ coerce: true }).positive(),
    img: z.string().min(1),
    type: z.number({ coerce: true }).int().min(0),
});

export const AddToCartSchema = z.object({
    nameProduct: z.string().min(1),
    quantityProduct: z.number({ coerce: true }).int().positive(),
    priceProduct: z.number({ coerce: true }).positive(),
    imgProduct: z.string().min(1),
    size: z.number({ coerce: true }).positive(),
    type: z.number({ coerce: true }).int().min(0),
});

export const UpdateCartInfoSchema = z.object({
    name: z.string().min(1),
    phone: z.number({ coerce: true }),
    address: z.string().min(1),
});

export interface ICartItem {
    _id?: Types.ObjectId;
    nameProduct: string;
    quantity: number;
    price: number;
    size: number;
    img: string;
    type: number;
}

export interface ICartDocument extends Document {
    user: string;
    products: ICartItem[];
    address: string;
    name: string;
    phone: number;
    sumprice: number;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface IPaymentDocument extends Document {
    products: ICartItem[];
    sumprice: number;
    tinhtrang: boolean;
    trangthai: boolean;
    phone: number;
    user: string;
    address: string;
    size: number;
    username: string;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Token ────────────────────────────────────────────────────────────────────

export interface ITokenDocument extends Document {
    usersId: Types.ObjectId;
    accessToken: string;
    refreshToken: string;
    createdAt: Date;
    updatedAt: Date;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtUserPayload {
    email: string;
    admin: boolean;
    iat: number;
    exp: number;
}
