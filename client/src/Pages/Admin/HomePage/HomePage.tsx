import classNames from 'classnames/bind';
import styles from './HomePage.module.scss';
import ManagerProduct from '../../../Components/ManageProducts';
import AddProducts from '../ComponentsAdmin/AddProducts/AddProducts';
import ManageOrder from '../../../Components/ManageOrder';
import { useState } from 'react';
import ManagerUser from '../../../Components/ManagerUser';
import ChartLine from '../../../Components/ChartLine';
import { IHomePageProps } from '../../../types';

const cx = classNames.bind(styles);

function HomePage({ checkTypeSlideBar }: IHomePageProps): JSX.Element {
    const [checkOpenAddProduct, setCheckOpenAddProduct] = useState(false);

    return (
        <div className={cx('wrapper')}>
            {checkTypeSlideBar === 1 && (
                checkOpenAddProduct
                    ? <AddProducts setCheckOpenAddProduct={setCheckOpenAddProduct} />
                    : <ManagerProduct setCheckOpenAddProduct={setCheckOpenAddProduct} />
            )}
            {checkTypeSlideBar === 2 && <ManageOrder />}
            {checkTypeSlideBar === 3 && <ManagerUser />}
            {checkTypeSlideBar === 4 && <ChartLine />}
        </div>
    );
}

export default HomePage;
