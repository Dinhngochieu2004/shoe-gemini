import { createContext } from 'react';
import { IStoreContext } from '../types';

const Context = createContext<IStoreContext>({
    dataUser: {},
    dataCart: [],
    getCart: async () => { },
});

export default Context;
