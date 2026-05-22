import classNames from 'classnames/bind';
import styles from '../Styles/ForgotPassword.module.scss';
import Header from '../Components/Header';
import request from '../Config/api';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const cx = classNames.bind(styles);

function ForgotPassword(): JSX.Element {
    const [email, setEmail] = useState('');
    const [isResetPassword, setIsResetPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const navigate = useNavigate();

    const handleForgotPassword = async (): Promise<void> => {
        try {
            const res = await request.post<{ message: string }>('/api/forgotpassword', { email });
            toast.success(res.data.message);
            if (res.status === 200) {
                setTimeout(() => setIsResetPassword(true), 2000);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message ?? 'Lỗi');
        }
    };

    const handleResetPassword = async (): Promise<void> => {
        try {
            const res = await request.post<{ message: string }>('/api/resetpassword', { token, otp, newPassword });
            toast.success(res.data.message);
            if (res.status === 200) {
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message ?? 'Lỗi');
        }
    };

    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <>
            <ToastContainer />
            <header><Header /></header>
            <div className={cx('wrapper')}>
                {!isResetPassword ? (
                    <main className={cx('main')}>
                        <div className={cx('inner')}>
                            <h1>Quên Mật Khẩu</h1>
                            <label>Nhập Tài Khoản Của Bạn</label>
                            <input placeholder="email" onChange={(e) => setEmail(e.target.value)} />
                            <button onClick={handleForgotPassword}>Gửi Yêu Cầu</button>
                        </div>
                    </main>
                ) : (
                    <main className={cx('main')}>
                        <div className={cx('inner-reset-password')}>
                            <h1>Thiết Lập Lại Mật Khẩu</h1>
                            <div><label>Token</label><input onChange={(e) => setToken(e.target.value)} /></div>
                            <div><label>OTP</label><input onChange={(e) => setOtp(e.target.value)} /></div>
                            <div><label>Mật Khẩu Mới</label><input type="password" onChange={(e) => setNewPassword(e.target.value)} /></div>
                            <button onClick={handleResetPassword}>Gửi Yêu Cầu</button>
                        </div>
                    </main>
                )}
            </div>
        </>
    );
}

export default ForgotPassword;
