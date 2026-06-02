import classNames from 'classnames/bind';
import styles from '../Styles/InfoUser.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request from '../Config/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faMoneyCheckDollar, faPhone } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cookies from 'js-cookie';
import { IUser, IPayment } from '../types';

const cx = classNames.bind(styles);

function InfoUser(): JSX.Element {
    const [dataUser, setDataUser] = useState<Partial<IUser>>({});
    const [dataPayments, setDataPayments] = useState<IPayment[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (cookies.get('logged') === '1') {
            request.get<IUser>('/api/auth').then((res) => setDataUser(res.data));
            request.get<IPayment[]>('/api/payments').then((res) => setDataPayments(res.data));
        }
    }, []);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const handleLogOut = (): void => {
        request.post('/api/logout');
        setTimeout(() => navigate('/'), 2000);
    };

    return (
        <div className={cx('wrapper')}>
            <header><Header /></header>
            <main className={cx('main')}>
                <div className={cx('info-user')}>
                    <div className={cx('inner')}>
                        <div className={cx('column-left')}>
                            <img src="https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=612x612&w=0&k=20&c=yBeyba0hUkh14_jgv1OKqIH0CCSWU_4ckRkAoy2p73o=" alt="" />
                            <div>
                                <ul>
                                    <li id={cx('name')}>{dataUser?.fullname}</li>
                                    <li><FontAwesomeIcon id={cx('icons')} icon={faEnvelope} />{dataUser?.email}</li>
                                    <li><FontAwesomeIcon id={cx('icons')} icon={faLock} />**********</li>
                                    <li><FontAwesomeIcon id={cx('icons')} icon={faPhone} />0{dataUser?.phone}</li>
                                    <li><FontAwesomeIcon id={cx('icons')} icon={faMoneyCheckDollar} /></li>
                                </ul>
                            </div>
                            <button onClick={handleLogOut} type="button" className="btn btn-danger">Đăng Xuất</button>
                        </div>
                        <div style={{ overflowX: 'auto' }} className="table-responsive">
                            <h2>Hoạt Động Gần Đây</h2>
                            <table style={{ marginTop: '20px', minWidth: '800px' }} className="table table-bordered border-primary">
                                <thead>
                                    <tr>
                                        <th>ID</th><th>Email</th><th>Tên Sản Phẩm</th>
                                        <th>Size</th><th>Số Lượng</th><th>Tổng Tiền</th><th>Trạng Thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataPayments.map((item) => (
                                        item.products.map((item2, index) => (
                                            <tr key={`${item._id}-${index}`}>
                                                {index === 0 && <><td rowSpan={item.products.length}>{item._id.slice(0, 7)}</td><td rowSpan={item.products.length}>{item.user}</td></>}
                                                <td>{item2.nameProduct}</td>
                                                <td>{item2.size}</td>
                                                <td>{item2.quantity}</td>
                                                {index === 0 && <><td rowSpan={item.products.length}>{item.sumprice.toLocaleString()} đ</td><td rowSpan={item.products.length}>{item.tinhtrang ? 'Đã Giao' : 'Đang Chuẩn Bị'}</td></>}
                                            </tr>
                                        ))
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
            <footer><Footer /></footer>
        </div>
    );
}

export default InfoUser;
