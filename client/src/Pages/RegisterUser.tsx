import classNames from 'classnames/bind';
import styles from '../Styles/Login.module.scss';
import request from '../Config/api';
import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link, useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

function RegisterUser(): JSX.Element {
    const navigate = useNavigate();
    const [fullname, setFullname] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = async (): Promise<void> => {
        try {
            const pattern = /[A-Z]/;
            const checkEmail = pattern.test(email);
            if (!fullname || !email || !password || !confirmPassword) {
                toast.error('Vui Lòng Xem Lại Thông Tin !!!');
            } else if (checkEmail) {
                toast.error('Email Không Được Viết Hoa !!!');
            } else if (password !== confirmPassword) {
                toast.error('Mật Khẩu Không Trùng Khớp !!!');
            } else {
                const res = await request.post<{ message: string }>('/api/register', {
                    fullname, email, password, confirmPassword, phone,
                });
                toast.success(res.data.message);
                setTimeout(() => navigate('/login'), 1500);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message ?? 'Đăng ký thất bại');
        }
    };

    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <>
            <div className={cx('body-wrapper')}>
                <ToastContainer />
                <div className={cx('wrapper')}>
                    <div className={cx('inner')}>
                        <div className={cx('header-form-login')}>
                            <span>Đăng ký</span>
                            <p>Đăng ký thành viên để nhận nhiều ưu đãi</p>
                        </div>
                        <div className={cx('input-box')}>
                            <div className={cx('form-input')}>
                                <label>Họ và tên</label>
                                <input placeholder="Nhập họ và tên" onChange={(e) => setFullname(e.target.value)} />
                            </div>
                            <div className={cx('form-input')}>
                                <label>Email</label>
                                <input placeholder="Nhập email" onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className={cx('form-input')}>
                                <label>Số điện thoại</label>
                                <input placeholder="Nhập số điện thoại" onChange={(e) => setPhone(e.target.value)} />
                            </div>
                            <div className={cx('form-input')}>
                                <label>Mật khẩu</label>
                                <input placeholder="Nhập mật khẩu" type="password" onChange={(e) => setPassword(e.target.value)} />
                            </div>
                            <div className={cx('form-input')}>
                                <label>Nhập lại mật khẩu</label>
                                <input type="password" placeholder="Nhập lại mật khẩu" onChange={(e) => setConfirmPassword(e.target.value)} />
                            </div>
                        </div>
                        <button className={cx('btn-login')} onClick={handleRegister}>Đăng ký</button>
                        <div className={cx('login-footer')}>
                            <p>Đã có tài khoản ? <Link id={cx('link')} to="/login">Đăng nhập</Link> ngay</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default RegisterUser;
