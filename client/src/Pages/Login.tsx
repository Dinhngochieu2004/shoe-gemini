import classNames from 'classnames/bind';
import styles from '../Styles/Login.module.scss';
import request from '../Config/api';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import cookies from 'js-cookie';

const cx = classNames.bind(styles);

function LoginUser(): JSX.Element {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLoginUser = async (): Promise<void> => {
        try {
            if (!email || !password) {
                toast.error('Vui lòng nhập đầy đủ email và mật khẩu!');
                return;
            }
            const pattern = /[A-Z]/;
            if (pattern.test(email)) {
                toast.error('Email không được chứa chữ in hoa!');
                return;
            }
            const res = await request.post<{ accessToken: string; user: { isAdmin: boolean }; message?: string }>(
                '/api/login',
                { email, password }
            );
            localStorage.setItem('accessToken', res.data.accessToken);
            cookies.set('logged', '1');
            toast.success(res.data.message ?? 'Đăng nhập thành công!');
            setTimeout(() => {
                navigate(res.data.user?.isAdmin ? '/admin' : '/');
                window.location.reload();
            }, 1000);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            const message = err?.response?.data?.message ?? 'Tài khoản hoặc mật khẩu không chính xác!';
            toast.error(message);
            localStorage.removeItem('accessToken');
        }
    };

    return (
        <>
            <div className={cx('body-wrapper')}>
                <ToastContainer />
                <div className={cx('wrapper')}>
                    <div className={cx('inner')}>
                        <div className={cx('header-form-login')}>
                            <span>Đăng nhập</span>
                            <p>Vui lòng đăng nhập để nhận thêm nhiều ưu đãi</p>
                        </div>
                        <div className={cx('input-box')}>
                            <div className={cx('form-input')}>
                                <label>Tên tài khoản hoặc Email đăng nhập</label>
                                <input
                                    placeholder="Nhập Tài Khoản / Email"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className={cx('form-input')}>
                                <label>Mật khẩu</label>
                                <input
                                    placeholder="Nhập Mật Khẩu"
                                    type="password"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <button className={cx('btn-login')} onClick={handleLoginUser}>
                                Đăng nhập
                            </button>
                            <div className={cx('single-input-fields')}>
                                <div>
                                    <input type="checkbox" />
                                    <label>Duy trì đăng nhập</label>
                                </div>
                                <Link to={'/forgotPassword'}>Quên mật khẩu?</Link>
                            </div>
                        </div>
                        <div className={cx('login-footer')}>
                            <p className="mb-0">
                                Bạn chưa có tài khoản ?{' '}
                                <Link id={cx('link')} to="/register">
                                    Đăng ký
                                </Link>{' '}
                                ngay
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default LoginUser;
