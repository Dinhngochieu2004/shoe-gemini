import { createContext } from 'react';
import { IStoreContext } from '../types';

const Context = createContext<IStoreContext>({
    dataUser: {},
    dataCart: [],
    isAuthLoading: true,
    getCart: async () => {},
});

export default Context;
