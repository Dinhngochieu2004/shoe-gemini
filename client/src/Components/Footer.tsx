import classNames from 'classnames/bind';
import styles from '../Styles/Footer.module.scss';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

function Footer(): JSX.Element {
    const navigate = useNavigate();

    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div className={cx('box-item')}>
                    <ul>
                        <li id={cx('item-title')}>DAT SNEAKERS</li>
                        <li>HỘ KINH DOANH DAT SNEAKERS</li>
                        <li>Ý Yên, Nam Định</li>
                        <li>0889708303</li>
                    </ul>
                </div>
                <div className={cx('box-item')}>
                    <ul>
                        <li id={cx('item-title')}>DANH MỤC</li>
                        <li>Giới thiệu về DAT SNEAKERS</li>
                        <li onClick={() => navigate('/category/giay-nam')}>Giày Nam</li>
                        <li onClick={() => navigate('/category/giay-nu')}>Giày Nữ</li>
                        <li onClick={() => navigate('/category/giay-tre-em')}>Giày Trẻ Em</li>
                    </ul>
                </div>
                <div className={cx('box-item')}>
                    <ul>
                        <li id={cx('item-title')}>CHÍNH SÁCH</li>
                        <li>Cam kết bảo hành</li>
                        <li>Phương thức thanh toán</li>
                        <li>Chính sách vận chuyển</li>
                        <li>Chính sách bảo mật</li>
                    </ul>
                </div>
            </div>
            <div className={cx('bottom')}>
                <p>© 2024 <span>DAT SNEAKERS</span>. Tất cả quyền được bảo lưu.</p>
                <p>Thiết kế bởi <span>DAT SNEAKERS Team</span></p>
            </div>
        </div>
    );
}

export default Footer;
