// ─── Domain Layer ─────────────────────────────────────────────────────────────
// Pure business types. No imports from infrastructure or application.

export interface IUser {
    _id: string;
    fullname: string;
    email: string;
    isAdmin: boolean;
    phone: number;
    createdAt: string;
    updatedAt: string;
}

export interface IProduct {
    _id: string;
    img: string[];
    name: string;
    price: number;
    slug: string;
    description: string;
    type: number;
    createdAt: string;
    updatedAt: string;
}

export interface ICartItem {
    _id: string;
    nameProduct: string;
    quantity: number;
    price: number;
    size: number;
    img: string;
    type: number;
}

export interface ICart {
    _id: string;
    user: string;
    products: ICartItem[];
    address: string;
    name: string;
    phone: number;
    sumprice: number;
    createdAt: string;
    updatedAt: string;
}

export interface IPayment {
    _id: string;
    products: ICartItem[];
    sumprice: number;
    tinhtrang: boolean;
    trangthai: boolean;
    phone: number;
    user: string;
    address: string;
    username: string;
    createdAt: string;
    updatedAt: string;
}

export interface IChatMessage {
    text: string;
    sender: 'user' | 'bot';
}
