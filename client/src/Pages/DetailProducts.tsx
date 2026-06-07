import classNames from 'classnames/bind';
import styles from '../Styles/DetailProducts.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request from '../Config/api';
import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';
import addToCartProduct from '../utils/HandleCart/AddToCart';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from '../Components/Navbar';
import CardBody from '../Components/CardBody';
import Slider from 'react-slick';
import SelectSize from '../utils/SelectSize/SelectSize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight, faRulerHorizontal, faTruck, faShield, faMoneyBillWave, faPhone } from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { IProduct } from '../types';

const cx = classNames.bind(styles);

const sizeOptions: Record<number, string[]> = {
    1: ['39', '40', '41', '42', '43', '44', '45'],
    2: ['35', '36', '37', '38', '39'],
    3: ['34', '35', '36', '37', '38', '39'],
};

const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 4,
    initialSlide: 0,
    responsive: [
        { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3, infinite: true, dots: true } },
        { breakpoint: 600, settings: { slidesToShow: 2, slidesToScroll: 2, initialSlide: 0 } },
        { breakpoint: 500, settings: { slidesToShow: 1, slidesToScroll: 1, initialSlide: 0, centerMode: true, centerPadding: '20px' } },
    ],
};

function DetailProducts(): JSX.Element {
    const location = useLocation();
    const id = location.pathname.split('/')[2];
    const nameProduct = window.location.pathname.split('/')[3];

    const [dataProduct, setDataProduct] = useState<IProduct[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [selectImg, setSelectImg] = useState(0);
    const [selectSize, setSelectSize] = useState('');
    const [checkType, setCheckType] = useState(0);
    const [show, setShow] = useState(false);
    const [similarProduct, setSimilarProduct] = useState<IProduct[]>([]);
    const { getCart } = useStore();

    useEffect(() => {
        const newNameProduct = nameProduct.slice(0, 16);
        request.get<IProduct[]>('/api/similarproduct', { params: { nameProduct: newNameProduct } })
            .then((res) => setSimilarProduct(res.data))
            .catch(() => {});
    }, [nameProduct]);

    useEffect(() => {
        dataProduct.forEach((item) => setCheckType(item.type === 1 ? 1 : item.type === 2 ? 2 : 3));
    }, [dataProduct]);

    useEffect(() => {
        request.get<IProduct[]>('/api/product', { params: { id } }).then((res) => setDataProduct(res.data)).catch(() => {});
    }, [id]);

    useEffect(() => {
        if (quantity < 1) setQuantity(1);
    }, [quantity]);

    useEffect(() => { window.scrollTo(0, 0); }, [id]);

    const handleAddProduct = async (props: IProduct): Promise<void> => {
        if (!selectSize) {
            toast.error('Vui lòng chọn size trước khi thêm vào giỏ hàng!');
            return;
        }
        try {
            const data = await addToCartProduct(props, quantity, selectSize);
            if (data) {
                toast.success(data.data.message);
                await getCart();
            } else {
                toast.error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
            }
        } catch {
            toast.error('Có lỗi xảy ra, vui lòng thử lại!');
        }
    };

    const onPrevImg = (): void => {
        if (!dataProduct[0]) return;
        setSelectImg((prev) => (prev > 0 ? prev - 1 : dataProduct[0].img.length - 1));
    };

    const onNextImg = (): void => {
        if (!dataProduct[0]) return;
        setSelectImg((prev) => (prev < dataProduct[0].img.length - 1 ? prev + 1 : 0));
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />
            <header><Header /></header>
            <main className={cx('main')}>
                <Navbar props={dataProduct} />
                {dataProduct.map((item) => (
                    <div key={item._id} className={cx('form-product')}>
                        <div className={cx('img-product')}>
                            <div className={cx('img-small')}>
                                {item.img.map((img, index) => (
                                    <img
                                        key={index}
                                        className={cx({ active: index === selectImg })}
                                        onClick={() => setSelectImg(index)}
                                        src={`${process.env.REACT_APP_IMG}/${img}`}
                                        alt={`${item.name} - ảnh ${index + 1}`}
                                    />
                                ))}
                            </div>
                            <img className={cx('img')} src={`${process.env.REACT_APP_IMG}/${item.img[selectImg]}`} alt={item.name} />
                            <button onClick={onPrevImg} id={cx('btn-1')}><FontAwesomeIcon icon={faAngleLeft} /></button>
                            <button onClick={onNextImg} id={cx('btn-2')}><FontAwesomeIcon icon={faAngleRight} /></button>
                        </div>
                        <div className={cx('info-product')}>
                            <div className={cx('title-product')}>
                                <h2>{item.name}</h2>
                                <span>{item.price.toLocaleString()} đ</span>
                            </div>
                            <div className={cx('select-size')}>
                                <div onClick={() => setShow(!show)} className={cx('btn-select')}>
                                    <button><FontAwesomeIcon icon={faRulerHorizontal} /> HƯỚNG DẪN CHỌN SIZE</button>
                                    <SelectSize dataProduct={dataProduct} show={show} setShow={setShow} />
                                </div>
                                <span>Kích Cỡ : {selectSize}</span>
                                <div className={cx('form-size')}>
                                    {(sizeOptions[checkType] ?? sizeOptions[3]).map((size) => (
                                        <div key={size} onClick={() => setSelectSize(size)} className={cx(selectSize === size ? 'active' : '')}>
                                            <button>{size}</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={cx('form-quantity')}>
                                <button onClick={() => setQuantity(quantity - 1)}>-</button>
                                <input id={cx('quantity')} value={quantity} readOnly />
                                <button onClick={() => setQuantity(quantity + 1)}>+</button>
                            </div>
                            <div className={cx('btn-add-cart')}>
                                <button onClick={() => handleAddProduct(item)}>Thêm Vào Giỏ Hàng</button>
                            </div>
                            <div className={cx('container')}>
                                {[
                                    { icon: faTruck,         title: 'Miễn phí vận chuyển', sub: 'Cho đơn hàng từ 800k' },
                                    { icon: faShield,        title: 'Bảo hành 6 tháng',    sub: '15 ngày đổi trả' },
                                    { icon: faMoneyBillWave, title: 'Thanh toán COD',       sub: 'Yên tâm mua sắm' },
                                    { icon: faPhone,         title: 'Hotline: 0866550286',  sub: 'Hỗ trợ bạn 24/7' },
                                ].map((box, i) => (
                                    <div key={i} className={cx('box')}>
                                        <FontAwesomeIcon icon={box.icon} />
                                        <div id={cx('info')}>
                                            <span style={{ fontWeight: '800' }}>{box.title}</span>
                                            <span>{box.sub}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {dataProduct.map((item) => (
                    <div key={item._id} className={cx('description')}>
                        <h2>THÔNG TIN SẢN PHẨM</h2>
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.description) }} />
                    </div>
                ))}
                <div>
                    <h4>SẢN PHẨM TƯƠNG TỰ</h4>
                    <Slider {...sliderSettings}>
                        {similarProduct.slice(0, 8).map((item) => (
                            <div key={item._id}><CardBody item={item} /></div>
                        ))}
                    </Slider>
                </div>
            </main>
            <footer><Footer /></footer>
        </div>
    );
}

export default DetailProducts;
