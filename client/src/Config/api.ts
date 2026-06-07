import axios, { AxiosRequestConfig } from 'axios';
import cookies from 'js-cookie';
import { IUser, ICart } from '../types';

const request = axios.create({
    baseURL: process.env.REACT_APP_SERVER,
    withCredentials: true,
});

request.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

export const requestAuth = async (): Promise<IUser> => {
    const res = await request.get<IUser>('/api/auth');
    return res.data;
};
export const requestRefreshToken = async (): Promise<{ accessToken: string }> => {
    const res = await request.get<{ accessToken: string }>('/api/refresh-token');
    return res.data;
};
export const requestLogout = async (): Promise<void> => {
    await request.post('/api/logout');
};
export const requestGetCart = async (): Promise<ICart[]> => {
    const res = await request.get<ICart[]>('/api/cart');
    return res.data;
};
export const requestAdmin = async (): Promise<{ message: string }> => {
    const res = await request.get<{ message: string }>('/api/admin');
    return res.data;
};
export const requestChat = async (question: string): Promise<string> => {
    const res = await request.post<string>('/chat', { question });
    return res.data;
};
export const requestUpdateInfoCart = async (data: {
    name: string;
    phone: number;
    address: string;
}): Promise<{ message: string }> => {
    const res = await request.post<{ message: string }>('/api/update-info-cart', data);
    return res.data;
};
export const requestPaymentVNPAY = async (data: unknown): Promise<{ vnpayResponse: string }> => {
    const res = await request.post<{ vnpayResponse: string }>('/api/paymentvnpay', data);
    return res.data;
};

let isRefreshing = false;
let failedRequestsQueue: Array<{
    resolve: () => void;
    reject: (err: unknown) => void;
}> = [];

request.interceptors.response.use(
    (response) => response,
    async (error: { config: AxiosRequestConfig & { _retry?: boolean }; response?: { status: number } }) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Another refresh already in progress — queue and wait
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedRequestsQueue.push({
                        resolve: () => resolve(request(originalRequest)),
                        reject: (err) => reject(err),
                    });
                });
            }

            isRefreshing = true;

            try {
                const token = cookies.get('logged');
                if (!token) {
                    isRefreshing = false;
                    return Promise.reject(error);
                }
                const data = await requestRefreshToken();
                if (data?.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                }
                failedRequestsQueue.forEach((req) => req.resolve());
                failedRequestsQueue = [];
                isRefreshing = false;
                // Retry the original request with the new token
                return request(originalRequest);
            } catch (refreshError) {
                failedRequestsQueue.forEach((req) => req.reject(refreshError));
                failedRequestsQueue = [];
                cookies.remove('logged');
                localStorage.removeItem('accessToken');
                isRefreshing = false;
                // Do NOT redirect — let the caller handle gracefully
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);

export default request;
