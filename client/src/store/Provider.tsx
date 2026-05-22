import React, { useEffect, useState } from 'react';
import Context from './Context';
import cookies from 'js-cookie';
import { requestAuth, requestGetCart } from '../Config/api';
import { IUser, ICart } from '../types';

export function Provider({ children }: { children: React.ReactNode }) {
    const [dataUser, setDataUser] = useState<IUser | Record<string, never>>({});
    const [dataCart, setDataCart] = useState<ICart[]>([]);

    const getCart = async (): Promise<void> => {
        const res = await requestGetCart();
        setDataCart(res);
    };

    useEffect(() => {
        const token = cookies.get('logged');

        const fetchData = async () => {
            try {
                const res = await requestAuth();
                setDataUser(res);
            } catch (error) {
                console.log(error);
            }
        };

        if (token === '1') {
            fetchData();
            getCart();
        }
    }, []);

    return (
        <Context.Provider value={{ dataUser, dataCart, getCart }}>
            {children}
        </Context.Provider>
    );
}
