import { useContext } from 'react';
import Context from '../store/Context';
import { IStoreContext } from '../types';

export const useStore = (): IStoreContext => {
    return useContext(Context);
};
