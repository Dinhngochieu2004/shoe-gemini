import React from 'react';
import App from '../App';
import Admin from '../Pages/Admin';
import Cart from '../Pages/Cart';
import Category from '../Pages/Category';
import DetailProducts from '../Pages/DetailProducts';
import InfoUser from '../Pages/InfoUser';
import LoginUser from '../Pages/Login';
import PaymentSuccess from '../Pages/PaymentSuccess';
import Payments from '../Pages/Payments';
import RegisterUser from '../Pages/RegisterUser';
import ForgotPassword from '../Pages/ForgotPassword';
import { IRoute } from '../types';

export const publicRoute: IRoute[] = [
    { path: '/', element: <App /> },
    { path: '/product/:id/:slug', element: <DetailProducts /> },
    { path: '/category', element: <Category /> },
    { path: '/cart', element: <Cart /> },
    { path: '/payments', element: <Payments /> },
    { path: '/login', element: <LoginUser /> },
    { path: '/register', element: <RegisterUser /> },
    { path: '/info', element: <InfoUser /> },
    { path: '/admin', element: <Admin /> },
    { path: '/category/:slug', element: <Category /> },
    { path: '/paymentsuccess', element: <PaymentSuccess /> },
    { path: '/forgotpassword', element: <ForgotPassword /> },
    { path: '*', element: <App /> },
];

export const privateRoute: IRoute[] = [{ path: '/admin', element: <Admin /> }];
