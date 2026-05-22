import classNames from 'classnames/bind';
import styles from '../Styles/Payments.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import axios from 'axios';
import request, { requestPaymentVNPAY, requestUpdateInfoCart } from '../Config/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { ICart, ICartItem } from '../types';

const cx = classNames.bind(styles);

interface ILocation { id: string; name: string; }

function Payments(): JSX.Element {
    const [dataCart, setDataCart] = useState<ICart[]>([]);
    const [tinhthanh, setTinhThanh] = useState<ILocation[]>([]);
    const [idTinhThanh, setIdTinhThanh] = useState(0);
    const [huyen, setHuyen] = useState<ILocation[]>([]);
    const [idHuyen, setIdHuyen] = useState(0);
    const [xa, setXa] = useState<ILocation[]>([]);
    const [address, setAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [dataProducts, setDataProducts] = useState<ICartItem[]>([]);
    const [dataLengthProducts, setDataLengthProducts] = useState(0);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const navigate = useNavigate();
    const { getCart } = useStore();

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (name && phone && address) {
                    await requestUpdateInfoCart({ name, phone: Number(phone), address });
                }
            } catch (error) { console.log(error); }
        };
        fetchData();
    }, [name, phone, address]);

    const totalProduct = useMemo(() => dataCart.map((item) => item.sumprice)[0] ?? 0, [dataCart]);

    useEffect(() => { axios.get<{ data: ILocation[] }>('https://esgoo.net/api-tinhthanh/1/0.htm').then((res) => setTinhThanh(res.data.data)); }, []);
    useEffect(() => { if (idTinhThanh !== 0) axios.get<{ data: ILocation[] }>(`https://esgoo.net/api-tinhthanh/2/${idTinhThanh}.htm`).then((res) => setHuyen(res.data.data)); }, [idTinhThanh]);
    useEffect(() => { if (idHuyen !== 0) axios.get<{ data: ILocation[] }>(`https://esgoo.net/api-tinhthanh/3/${idHuyen}.htm`).then((res) => setXa(res.data.data)); }, [idHuyen]);
    useEffect(() => { const p = dataCart?.map((item) => item.products); setDataProducts(p[0] ?? []); }, [dataCart]);
    useEffect(() => { request.get<ICart[]>('/api/cart').then((res) => setDataCart(res.data)); }, []);
    useEffect(() => { const t = dataCart?.reduce((total, c) => total + c.products.reduce((s, p) => s + p.quantity, 0), 0); setDataLengthProducts(t); }, [dataCart]);
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const handlePayment = async (): Promise<void> => {
        try {
            if (paymentMethod === 'Momo') {
                const res = await request.post<{ payUrl: string }>('/api/payment', { dataProducts, address });
                window.open(res.data.payUrl);
                await getCart();
            } else if (paymentMethod === 'VNPAY') {
                const res = await requestPaymentVNPAY({});
                window.open(res.vnpayResponse);
            } else if (paymentMethod === 'COD') {
                const res = await request.post<{ message: string }>('/api/paymentcod', { dataProducts, address });
                toast.success(res.data.message);
                await getCart();
                navigate('/paymentsuccess');
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message ?? 'Lỗi thanh toán');
        }
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />
            <header><Header /></header>
            <main className={cx('main')}>
                <h2>Thanh toán</h2>
                <div className={cx('form-payments')}>
                    <div className={cx('column-left')}>
                        <h3>THÔNG TIN THANH TOÁN</h3>
                        <div className={cx('form-1')}>
                            <div className="form-floating mb-3">
                                <input type="text" className="form-control" id="floatingInput" onChange={(e) => setName(e.target.value)} />
                                <label htmlFor="floatingInput">Họ và tên *</label>
                            </div>
                            <div className="form-floating">
                                <input type="text" className="form-control" id="floatingPassword" onChange={(e) => setPhone(e.target.value)} />
                                <label htmlFor="floatingPassword">Số điện thoại *</label>
                            </div>
                        </div>
                        <div>
                            <select className="form-select" onChange={(e) => setIdTinhThanh(Number(e.target.value))}>
                                <option value="0">Tỉnh/Thành</option>
                                {tinhthanh.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <select onChange={(e) => setIdHuyen(Number(e.target.value))} className="form-select mt-3">
                                <option value="0">Quận/Huyện</option>
                                {huyen.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            <select className="form-select mt-3">
                                <option value="0">Xã/Phường/Thị trấn</option>
                                {xa.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="form-floating mt-3">
                                <input type="text" className="form-control" id="floatingAddress" onChange={(e) => setAddress(e.target.value)} />
                                <label htmlFor="floatingAddress">Địa Chỉ *</label>
                            </div>
                        </div>
                        <div className={cx('select-payment')}>
                            <h4>PHƯƠNG THỨC THANH TOÁN</h4>
                            {['COD', 'Momo', 'VNPAY'].map((method) => (
                                <div key={method} className="form-check">
                                    <input className="form-check-input" type="radio" name="paymentMethod" value={method}
                                        onChange={(e) => setPaymentMethod(e.target.value)} checked={paymentMethod === method} />
                                    <label className="form-check-label">
                                        {method === 'COD' ? 'Thanh Toán Khi Nhận Hàng' : method === 'Momo' ? 'Thanh Toán Qua Momo' : 'Thanh Toán Qua VNPAY'}
                                    </label>
                                </div>
                            ))}
                            <div onClick={handlePayment} className={cx('btn-payment')}>
                                <button id={cx('btn-buy')}>Hoàn Tất Đơn Hàng</button>
                            </div>
                        </div>
                    </div>
                    <div className={cx('total-product')}>
                        <h3>TỔNG CỘNG | {dataLengthProducts} SẢN PHẨM</h3>
                        <table className="table table-bordered border-primary">
                            <thead><tr><th>Tạm tính</th><th>{totalProduct?.toLocaleString()}đ</th></tr></thead>
                            <tbody>
                                <tr><td>Phí Vận Chuyển</td><td>Miễn phí</td></tr>
                                <tr><td>Tổng Cộng</td><th>{totalProduct?.toLocaleString()}đ</th></tr>
                            </tbody>
                        </table>
                        <div className={cx('img-product')}>
                            <h4>SẢN PHẨM ĐÃ ĐẶT HÀNG</h4>
                            <div className={cx('img')}>
                                {dataProducts?.map((item, i) => (
                                    <img key={i} src={`${process.env.REACT_APP_IMG}/${item.img}`} alt={item.nameProduct} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <footer><Footer /></footer>
        </div>
    );
}

export default Payments;
