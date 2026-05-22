import classNames from 'classnames/bind';
import styles from '../Styles/Navbar.module.scss';
import { IProduct } from '../types';

const cx = classNames.bind(styles);

interface NavbarProps {
    props: IProduct[];
}

function Navbar({ props }: NavbarProps): JSX.Element {
    return (
        <div className={cx('wrapper')}>
            {props.map((item) => (
                <span key={item._id}>
                    Trang Chủ / {item.type === 1 ? 'Giày Nam' : item.type === 2 ? 'Giày Nữ' : 'Giày Trẻ Em'} / {item.name}
                </span>
            ))}
        </div>
    );
}

export default Navbar;
