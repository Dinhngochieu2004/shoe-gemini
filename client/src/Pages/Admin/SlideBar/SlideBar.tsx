import classNames from 'classnames/bind';
import styles from './Slidebar.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBagShopping, faCartPlus, faChartLine, faRightFromBracket, faUsers } from '@fortawesome/free-solid-svg-icons';
import cookies from 'js-cookie';
import request from '../../../Config/api';
import { useNavigate } from 'react-router-dom';
import { ISlideBarProps } from '../../../types';

const cx = classNames.bind(styles);

function SlideBar({ setCheckTypeSlideBar, checkTypeSlideBar }: ISlideBarProps): JSX.Element {
    const navigate = useNavigate();

    const handleLogout = async (): Promise<void> => {
        try {
            await request.post('/api/logout');
        } catch {
            // ignore — still clear local state even if server call fails
        } finally {
            cookies.remove('logged');
            localStorage.removeItem('accessToken');
            navigate('/');
            window.location.reload();
        }
    };

    const menuItems = [
        { type: 1, icon: faBagShopping, label: 'Quản Lý Sản Phẩm' },
        { type: 2, icon: faCartPlus, label: 'Quản Lý Đơn Hàng' },
        { type: 3, icon: faUsers, label: 'Quản Lý Người Dùng' },
        { type: 4, icon: faChartLine, label: 'Quản Lý Doanh Thu' },
    ];

    return (
        <div className={cx('wrapper')}>
            <h4>Quản Trị Admin</h4>
            <ul>
                {menuItems.map(({ type, icon, label }) => (
                    <li key={type} onClick={() => setCheckTypeSlideBar(type)} id={cx(checkTypeSlideBar === type ? 'active' : '')}>
                        <FontAwesomeIcon icon={icon} />
                        {label}
                    </li>
                ))}
                <li onClick={handleLogout} id={cx('logout')}>
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    Đăng xuất
                </li>
            </ul>
        </div>
    );
}

export default SlideBar;
