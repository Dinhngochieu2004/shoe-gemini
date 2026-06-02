import classNames from 'classnames/bind';
import styles from '../Styles/CardBody.module.scss';
import ModalDetailProduct from '../utils/Modal/ModalDetailProduct';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartPlus } from '@fortawesome/free-solid-svg-icons';
import { faEye } from '@fortawesome/free-regular-svg-icons';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { IProduct } from '../types';

const cx = classNames.bind(styles);

interface CardBodyProps {
    item: IProduct;
}

function CardBody({ item }: CardBodyProps): JSX.Element {
    const [show, setShow] = useState(false);

    return (
        <div className={cx('wrapper')}>
            <div className={cx('img')}>
                <img src={`${process.env.REACT_APP_IMG}/${item?.img[0]}`} alt={item?.name} />
                <div className={cx('container')}>
                    <button onClick={() => setShow(true)} data-testid="card-add-to-cart">
                        <FontAwesomeIcon icon={faCartPlus} />
                    </button>
                    <button onClick={() => setShow(true)} data-testid="card-view-detail">
                        <FontAwesomeIcon icon={faEye} />
                    </button>
                </div>
            </div>
            <Link style={{ textDecoration: 'none' }} to={`/product/${item?._id}/${item?.slug}`}>
                <div className={cx('info')}>
                    <h2>{item?.name}</h2>
                    <span>{item?.price?.toLocaleString()} đ</span>
                </div>
            </Link>
            <ModalDetailProduct show={show} setShow={setShow} id={item?._id} />
        </div>
    );
}

export default CardBody;
