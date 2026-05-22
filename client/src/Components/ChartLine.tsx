import classNames from 'classnames/bind';
import styles from '../Styles/ChartLine.module.scss';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useEffect, useState } from 'react';
import request from '../Config/api';
import { ICartItem } from '../types';

const cx = classNames.bind(styles);
ChartJS.register(ArcElement, Tooltip, Legend);

function ChartLine(): JSX.Element {
    const [dataOrder, setDataOrder] = useState<ICartItem[][]>([]);
    const [dataPrice, setDataPrice] = useState(0);
    const [dataPrice2, setDataPrice2] = useState(0);
    const [dataPrice3, setDataPrice3] = useState(0);

    useEffect(() => {
        request.get<ICartItem[][]>('/api/dataorderuser').then((res) => {
            if (res?.data) setDataOrder(res.data);
        });
    }, []);

    useEffect(() => {
        const sum = (type: number) =>
            dataOrder
                .map((items) => items.filter((i) => i.type === type))
                .map((items) => items.reduce((t, i) => t + i.price * i.quantity, 0))
                .reduce((t, v) => t + v, 0);
        setDataPrice(sum(1));
        setDataPrice2(sum(2));
        setDataPrice3(sum(3));
    }, [dataOrder]);

    const data = {
        labels: ['Giày Nam', 'Giày Nữ', 'Giày trẻ em'],
        datasets: [{
            label: 'Doanh Thu Đã Bán',
            data: [dataPrice, dataPrice2, dataPrice3],
            backgroundColor: ['rgba(255,99,132,0.2)', 'rgba(54,162,235,0.2)', 'rgba(255,206,86,0.2)'],
            borderColor: ['rgba(255,99,132,1)', 'rgba(54,162,235,1)', 'rgba(255,206,86,1)'],
            borderWidth: 1,
        }],
    };

    return (
        <div>
            <h4>Quản Lý Doanh Thu</h4>
            <div className={cx('chart')}>
                <Pie data={data} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            </div>
        </div>
    );
}

export default ChartLine;
