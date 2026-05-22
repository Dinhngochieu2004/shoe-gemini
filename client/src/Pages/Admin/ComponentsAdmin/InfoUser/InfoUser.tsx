import styles from './InfoUser.module.scss';
import classNames from 'classnames/bind';

const cx = classNames.bind(styles);

function InfoUser(): JSX.Element {
    return <div className={cx('wrapper')}></div>;
}

export default InfoUser;
