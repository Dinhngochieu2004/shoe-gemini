// ─── Application Layer — Store Types ──────────────────────────────────────────
import React from 'react';
import { IUser, ICart, IProduct } from '../../domain';

export interface IStoreContext {
    dataUser: IUser | Record<string, never>;
    dataCart: ICart[];
    isAuthLoading: boolean;
    getCart: () => Promise<void>;
}

export interface IRoute {
    path: string;
    element: React.ReactElement;
}

export interface IAddToCartParams {
    _id: string;
    name: string;
    price: number;
    img: string[];
    type: number;
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
    page: number;
    handlePageChange: (event: React.ChangeEvent<unknown>, value: number) => void;
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
