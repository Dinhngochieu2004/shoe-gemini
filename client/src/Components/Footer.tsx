import classNames from 'classnames/bind';
import styles from '../Styles/Footer.module.scss';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

function Footer(): JSX.Element {
    const navigate = useNavigate();
    const onPage = (url: string): void => { navigate(url); };

    return (
        <div className={cx('wrapper')}>
            <main>
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
                            <li id={cx('item-title')}>DANH MỤC NỔI BẬT</li>
                            <li>Giới thiệu về DAT SNEAKERS</li>
                            <li onClick={() => onPage('/category/giay-nam')}>Giày Nam</li>
                            <li onClick={() => onPage('/category/giay-nu')}>Giày Nữ</li>
                            <li onClick={() => onPage('/category/giay-tre-em')}>Giày Trẻ Em</li>
                        </ul>
                    </div>
                    <div className={cx('box-item')}>
                        <ul>
                            <li id={cx('item-title')}>CHÍNH SÁCH CÔNG TY</li>
                            <li>CAM KẾT BẢO HÀNH</li>
                            <li>PHƯƠNG THỨC THANH TOÁN</li>
                            <li>CHÍNH SÁCH VẬN CHUYỂN</li>
                            <li>CHÍNH SÁCH BẢO MẬT</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Footer;
