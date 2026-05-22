import classNames from 'classnames/bind';
import styles from '../Styles/PaymentsSuccess.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import { useEffect, useState } from 'react';
import request from '../Config/api';
import { IPayment } from '../types';

const cx = classNames.bind(styles);

function PaymentSuccess(): JSX.Element {
    const [dataPayment, setDataPayment] = useState<IPayment[]>([]);
    const token = document.cookie;

    useEffect(() => { window.scrollTo(0, 0); }, []);

    useEffect(() => {
        if (!token) return;
        request.get<IPayment[]>('/api/payment').then((res) => setDataPayment(res.data));
    }, [token]);

    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    return (
        <div className={cx('wrapper')}>
            <header><Header /></header>
            <main className={cx('main')}>
                <div className={cx('success-animation')}>
                    <svg className={cx('checkmark')} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className={cx('checkmark__circle')} cx="26" cy="26" r="25" fill="none" />
                        <path className={cx('checkmark__check')} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                </div>
                {dataPayment.map((item) => (
                    <div key={item._id} className={cx('content')}>
                        <h2>Thanh Toán Thành Công</h2>
                        <div className={cx('info')}>
                            <h3>Cảm ơn Quý Khách!</h3>
                            <ul>
                                Thông tin thanh toán
                                <li>Số tiền thanh toán: {item.sumprice.toLocaleString()} đ</li>
                                <li>Ngày thanh toán: {formattedDate}</li>
                                <li>Phương thức: {item.trangthai ? 'Đã Thanh Toán' : 'Thanh Toán Khi Nhận Hàng'}</li>
                            </ul>
                        </div>
                    </div>
                ))}
            </main>
            <footer><Footer /></footer>
        </div>
    );
}

export default PaymentSuccess;
