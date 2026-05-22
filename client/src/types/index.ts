import React from 'react';

// ─── API Response Types ───────────────────────────────────────────────────────

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

// ─── Store / Context Types ────────────────────────────────────────────────────

export interface IStoreContext {
    dataUser: IUser | Record<string, never>;
    dataCart: ICart[];
    getCart: () => Promise<void>;
}

// ─── Route Types ──────────────────────────────────────────────────────────────

export interface IRoute {
    path: string;
    element: React.ReactElement;
}

// ─── Chat Types ───────────────────────────────────────────────────────────────

export interface IChatMessage {
    text: string;
    sender: 'user' | 'bot';
}

// ─── Component Prop Types ─────────────────────────────────────────────────────

export interface IProductsTabProps {
    dataProducts: IProduct[];
}

export interface ICardBodyProps {
    item: IProduct;
}

export interface IPaginationProps {
    totalPages: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}

export interface IModalDetailProductProps {
    id: string;
    show: boolean;
    setShow: (show: boolean) => void;
}

export interface ISlideBarProps {
    checkTypeSlideBar: number;
    setCheckTypeSlideBar: (type: number) => void;
}

export interface IHomePageProps {
    checkTypeSlideBar: number;
}

export interface IAddToCartParams {
    _id: string;
    name: string;
    price: number;
    img: string[];
    type: number;
}
