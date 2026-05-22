import classNames from 'classnames/bind';
import styles from '../../Styles/ModalDetailProduct.module.scss';
import Modal from 'react-bootstrap/Modal';
import addToCartProduct from '../HandleCart/AddToCart';
import request from '../../Config/api';
import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useStore } from '../../hooks/useStore';
import { IProduct } from '../../types';

const cx = classNames.bind(styles);

interface ModalDetailProductProps {
    id: string;
    show: boolean;
    setShow: (val: boolean) => void;
}

function ModalDetailProduct({ id, show, setShow }: ModalDetailProductProps): JSX.Element {
    const handleClose = () => setShow(false);
    const [quantity, setQuantity] = useState(1);
    const [dataProduct, setDataProduct] = useState<IProduct[]>([]);
    const [selectSize, setSelectSize] = useState('');
    const [checkType, setCheckType] = useState(0);
    const { dataUser, getCart } = useStore();

    useEffect(() => {
        dataProduct.forEach((item) => {
            setCheckType(item.type === 1 ? 1 : item.type === 2 ? 2 : 3);
        });
    }, [dataProduct]);

    useEffect(() => {
        if (!id) return;
        request.get<IProduct[]>('/api/product', { params: { id } }).then((res) => setDataProduct(res.data));
    }, [id]);

    useEffect(() => {
        if (quantity < 1) setQuantity(1);
    }, [quantity]);

    const handleAddToCart = async (props: IProduct): Promise<void> => {
        if (!dataUser?._id) return void toast.error('Vui lòng đăng nhập');
        try {
            await addToCartProduct(props, quantity, selectSize);
            await getCart();
            toast.success('Thêm vào giỏ hàng thành công');
        } catch {
            toast.error('Vui lòng đăng nhập');
        }
    };

    const sizeOptions: Record<number, string[]> = {
        1: ['39', '40', '41', '42', '43', '44', '45'],
        2: ['35', '36', '37', '38', '39'],
        3: ['34', '35', '36', '37', '38', '39'],
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />
            <Modal show={show} size="lg" aria-labelledby="contained-modal-title-vcenter" centered onHide={handleClose}>
                {dataProduct.map((item) => (
                    <Modal.Body key={item._id} className={cx('modal-body')}>
                        <div className={cx('img')}>
                            <img src={`${process.env.REACT_APP_IMG}/${item.img[0]}`} alt="" />
                        </div>
                        <div className={cx('content')}>
                            <h2>{item.name}</h2>
                            <span id={cx('price')}>{item.price.toLocaleString()} đ</span>
                            <div dangerouslySetInnerHTML={{ __html: item?.description }} />
                            <div className={cx('select-size')}>
                                <span>Kích Cỡ : {selectSize}</span>
                                <div className={cx('form-size')}>
                                    {(sizeOptions[checkType] ?? sizeOptions[3]).map((size) => (
                                        <div key={size} onClick={() => setSelectSize(size)} className={cx(selectSize === size ? 'active' : '')}>
                                            <button>{size}</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={cx('btn-add-to-cart')}>
                                <div className={cx('form-quantity')}>
                                    <button onClick={() => setQuantity(quantity - 1)}>-</button>
                                    <input id={cx('quantity')} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                                    <button onClick={() => setQuantity(quantity + 1)}>+</button>
                                </div>
                                <div className={cx('btn-add-cart')}>
                                    <button onClick={() => handleAddToCart(item)}>Thêm Vào Giỏ Hàng</button>
                                </div>
                            </div>
                        </div>
                    </Modal.Body>
                ))}
            </Modal>
        </div>
    );
}

export default ModalDetailProduct;
