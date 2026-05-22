import classNames from 'classnames/bind';
import styles from '../Styles/FeatureGrid.module.scss';

const cx = classNames.bind(styles);

const collections = [
    { src: 'https://static.nike.com/a/images/f_auto/dpr_1.3,cs_srgb/h_583,c_limit/cb28c551-b85b-479f-8fc3-40ad4e7c9ca4/nike-just-do-it.jpg', label: 'NIKESHOP Collection 1' },
    { src: 'https://static.nike.com/a/images/f_auto/dpr_1.3,cs_srgb/h_583,c_limit/100ca749-1a94-4f98-bc43-a58e7e9cdbcf/nike-just-do-it.png', label: 'NIKESHOP Collection 2' },
    { src: 'https://static.nike.com/a/images/f_auto/dpr_1.3,cs_srgb/h_583,c_limit/39412611-0af5-4770-8c2e-ef5c23bc6a3d/nike-just-do-it.jpg', label: 'NIKESHOP Collection 3' },
    { src: 'https://static.nike.com/a/images/f_auto/dpr_1.3,cs_srgb/h_583,c_limit/a9767bce-db10-41ff-9eb5-f5daf8bbb3e6/nike-just-do-it.png', label: 'NIKESHOP Collection 4' },
];

function FeatureGrid(): JSX.Element {
    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <h2>NIKESHOP COLLECTION</h2>
                <div className={cx('img-grid')}>
                    {collections.map((c, i) => (
                        <div key={i} className={cx('img-item')}>
                            <img src={c.src} alt="" />
                            <span>{c.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default FeatureGrid;
