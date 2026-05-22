import classNames from 'classnames/bind';
import styles from '../Styles/Slider.module.scss';
import banner from '../assests/imgs/banner.jpg';

const cx = classNames.bind(styles);

function Slider(): JSX.Element {
    return (
        <div className={cx('wrapper')}>
            <div id={cx('slider')}>
                <img src={banner} alt="Banner" style={{ height: '600px' }} />
            </div>
            <div className={cx('container')}>
                {[
                    { src: 'https://i0.wp.com/peaksport.vn/wp-content/uploads/2023/11/icon-3.png?resize=40%2C41&ssl=1', title: 'Miễn phí vận chuyển', sub: 'Cho đơn hàng từ 800k' },
                    { src: 'https://i0.wp.com/peaksport.vn/wp-content/uploads/2023/11/icon.png?resize=40%2C41&ssl=1', title: 'Bảo hành 6 tháng', sub: '15 ngày đổi trả' },
                    { src: 'https://i0.wp.com/peaksport.vn/wp-content/uploads/2023/11/icon-1-1.png?resize=40%2C41&ssl=1', title: 'Thanh toán COD', sub: 'Yên tâm mua sắm' },
                    { src: 'https://i0.wp.com/peaksport.vn/wp-content/uploads/2023/11/icon-2-1.png?resize=40%2C41&ssl=1', title: 'Hotline: 0889708303', sub: 'Hỗ trợ bạn 24/7', noBorder: true },
                ].map((item, i) => (
                    <div key={i} style={item.noBorder ? { borderRight: 'none' } : {}} className={cx('box')}>
                        <img src={item.src} alt="" />
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
