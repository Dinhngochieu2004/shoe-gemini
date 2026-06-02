import classNames from 'classnames/bind';
import styles from '../Styles/Slider.module.scss';
import banner from '../assests/imgs/banner.jpg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faShield, faMoneyBillWave, faPhone } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

const serviceItems = [
    { icon: faTruck,          title: 'Miễn phí vận chuyển', sub: 'Cho đơn hàng từ 800k' },
    { icon: faShield,         title: 'Bảo hành 6 tháng',    sub: '15 ngày đổi trả' },
    { icon: faMoneyBillWave,  title: 'Thanh toán COD',       sub: 'Yên tâm mua sắm' },
    { icon: faPhone,          title: 'Hotline: 0889708303',  sub: 'Hỗ trợ bạn 24/7' },
];

function Slider(): JSX.Element {
    return (
        <div className={cx('wrapper')}>
            <div id={cx('slider')}>
                <img src={banner} alt="Banner" />
            </div>
            <div className={cx('container')}>
                {serviceItems.map((item, i) => (
                    <div key={i} className={cx('box')}>
                        <FontAwesomeIcon icon={item.icon} />
                        <div id={cx('info')}>
                            <span style={{ fontWeight: '800' }}>{item.title}</span>
                            <span>{item.sub}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Slider;
