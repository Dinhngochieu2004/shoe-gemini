import classNames from 'classnames/bind';
import styles from '../Styles/ProductsTab.module.scss';
import CardBody from './CardBody';
import { useState } from 'react';
import { IProduct } from '../types';

const cx = classNames.bind(styles);

interface ProductsTabProps {
    dataProducts: IProduct[];
}

function ProductsTab({ dataProducts }: ProductsTabProps): JSX.Element {
    const [checkList, setCheckList] = useState('1');

    return (
        <div className={cx('wrapper')}>
            <header>
                <h1>Sản Phẩm Nổi Bật</h1>
                <div className={cx('list-select')}>
                    <ul style={{ padding: '0' }}>
                        {['1', '2', '3'].map((val, i) => (
                            <li key={val} onClick={() => setCheckList(val)}
                                className={checkList === val ? cx('active-list') : undefined}>
                                {['Giày Nam Giới', 'Giày Nữ Giới', 'Giày Trẻ Em'][i]}
                            </li>
                        ))}
                    </ul>
                </div>
            </header>
            <main className={cx('main')}>
                {dataProducts
                    .filter((item) => item.type === Number(checkList))
                    .slice(0, 8)
                    .map((item) => <CardBody key={item._id} item={item} />)}
            </main>
        </div>
    );
}

export default ProductsTab;
