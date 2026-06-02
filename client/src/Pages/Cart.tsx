import classNames from 'classnames/bind';
import styles from '../Styles/Cart.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request from '../Config/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useStore } from '../hooks/useStore';
import { ICartItem } from '../types';

const cx = classNames.bind(styles);

function Cart(): JSX.Element {
    const [dataProducts, setDataProducts] = useState<ICartItem[]>([]);
    const [dataLengthProducts, setDataLengthProducts] = useState(0);
    const navigate = useNavigate();
    const { dataCart, getCart } = useStore();

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const totalProduct = useMemo(() => {
        return dataCart?.map((item) => item.sumprice)[0] ?? 0;
    }, [dataCart]);

    useEffect(() => {
        const newDataProducts = dataCart?.map((item) => item.products);
        setDataProducts(newDataProducts[0] ?? []);
    }, [dataCart]);

    const handleDeleteCart = async (id: string): Promise<void> => {
        await request.post<{ message: string }>('/api/deletecart', { id }).then((res) => toast.success(res.data.message));
        getCart();
    };

    useEffect(() => {
        const totalQuantity = dataCart?.reduce((total, cartItem) => {
            return total + cartItem.products.reduce((sum, product) => sum + product.quantity, 0);
        }, 0);
        setDataLengthProducts(totalQuantity);
    }, [dataCart]);

    const nextPage = (): void => {
        if (dataProducts && dataProducts.length > 0) {
            setTimeout(() => navigate('/payments'), 1000);
        } else {
            toast.error('Vui lòng thêm sản phẩm vào giỏ hàng để thanh toán !!!');
        }
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />
            <header><Header /></header>
            <main className={cx('main')}>
                <h2>Giỏ Hàng</h2>
                <div className={cx('inner')}>
                    {dataCart.length > 0 ? (
                        <div>
                            {dataProducts?.map((item) => (
                                <div key={item._id} className={cx('cart-products')}>
                                    <div className={cx('img-product')}>
                                        <img src={`${process.env.REACT_APP_IMG}/${item?.img}`} alt={item?.nameProduct} />
                                    </div>
                                    <div className={cx('info-product')}>
                                        <h2>{item?.nameProduct}</h2>
                                        <span style={{ fontSize: '17px', fontWeight: '700' }}>Số Lượng: x{item?.quantity}</span>
                                        <span style={{ fontSize: '17px', fontWeight: '700' }}>Size: {item?.size}</span>
                                        <span id={cx('price')}>{(item?.price * item?.quantity).toLocaleString()} đ</span>
                                    </div>
                                    <div className={cx('remove-product')}>
                                        <button onClick={() => handleDeleteCart(item?._id)}>
                                            <FontAwesomeIcon icon={faClose} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={cx('no-product')}>
                            <img src="https://static.topcv.vn/v4/image/job-list/none-result.png" alt="" />
                            <span>Bạn Chưa Có Sản Phẩm Nào</span>
                        </div>
                    )}
                    <div className={cx('total-product')}>
                        <h3>TỔNG CỘNG | {dataLengthProducts} SẢN PHẨM</h3>
                        <div>
                            <table className="table table-bordered border-primary">
                                <thead>
                                    <tr>
                                        <th scope="col">Tạm tính</th>
                                        <th scope="col">{totalProduct.toLocaleString()} đ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td>Phí Vận Chuyển</td><td>Miễn phí vận chuyển</td></tr>
                                    <tr><td>Tổng Cộng</td><th>{totalProduct.toLocaleString()} đ</th></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className={cx('btn-total')}>
                            <button id={cx('btn-buy')} onClick={nextPage}>Tiến hành thanh toán</button>
                            <button id={cx('btn-continue')} onClick={() => navigate('/category')}>Tiếp tục mua sắm</button>
                        </div>
                    </div>
                </div>
            </main>
            <footer><Footer /></footer>
        </div>
    );
}

export default Cart;
