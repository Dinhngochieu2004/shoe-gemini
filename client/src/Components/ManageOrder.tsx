import { useEffect, useState } from 'react';
import request from '../Config/api';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import classNames from 'classnames/bind';
import styles from '../Styles/ManageOrder.module.scss';
import Pagination from './Pagination';
import ModalEditOrder from '../utils/Modal/ModalEditOrder';
import ModalCancelOrder from '../utils/Modal/CancelOrder';
import { IPayment } from '../types';
import React from 'react';

const cx = classNames.bind(styles);

function ManageOrder(): JSX.Element {
    const [dataCart, setDataCart] = useState<IPayment[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [idPro, setIdPro] = useState<string>('');
    const [address, setAddress] = useState('');
    const [showModalCancelOrder, setShowModalCancelOrder] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [page, setPage] = useState(1);

    const productsPerPage = 5;
    const startIndex = (page - 1) * productsPerPage;
    const totalPages = Math.ceil(dataCart.length / productsPerPage);
    const currentProducts = dataCart.slice(startIndex, startIndex + productsPerPage);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number): void => { setPage(value); };

    useEffect(() => {
        const fetchData = async () => {
            const res = await request.get<IPayment[]>('/api/getallorder');
            setDataCart(res.data);
        };
        fetchData();
    }, [showModal, showModalCancelOrder]);

    const handleShowModalEdit = (id: string, address1: string): void => {
        setShowModal(!showModal);
        setIdPro(id);
        setAddress(address1);
    };

    return (
        <div className={cx('manage-product')}>
            <ToastContainer />
            <h2 style={{ fontSize: '25px', marginBottom: '20px' }}>Quản Lý Đơn Hàng</h2>
            <div className="table-responsive">
                <table className="table table-bordered border-primary">
                    <thead className="table-light">
                        <tr>
                            <th>Người Dùng</th><th>Số ĐT</th><th>Địa Chỉ</th>
                            <th>Tên Đơn Hàng</th><th>Size</th><th>Số Lượng</th>
                            <th>Tổng Giá</th><th>Tình Trạng</th><th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentProducts.map((item) =>
                            item.products.map((item2, index) => (
                                <tr key={item2._id}>
                                    {index === 0 && (
                                        <>
                                            <td rowSpan={item.products.length}>{item.username}</td>
                                            <td rowSpan={item.products.length}>0{item.phone}</td>
                                            <td rowSpan={item.products.length}>{item.address}</td>
                                        </>
                                    )}
                                    <td>{item2.nameProduct}</td>
                                    <td>{item2.size || 'N/A'}</td>
                                    <td>{item2.quantity}</td>
                                    {index === 0 && (
                                        <>
                                            <td rowSpan={item.products.length}>{item.sumprice.toLocaleString()} đ</td>
                                            <td rowSpan={item.products.length}>{item.tinhtrang ? 'Đã Giao' : 'Chuẩn Bị'}</td>
                                            <td rowSpan={item.products.length}>
                                                <button onClick={() => handleShowModalEdit(item._id, item.address)} className="btn btn-primary" style={{ marginRight: '10px' }}>Xác Nhận</button>
                                                <button onClick={() => { setSelectedProduct(item._id); setShowModalCancelOrder(true); }} className="btn btn-danger">Hủy</button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className={cx('pagination')}>
                    <Pagination page={page} totalPages={totalPages} handlePageChange={handlePageChange} />
                </div>
            </div>
            <ModalEditOrder show={showModal} setShow={setShowModal} id={idPro} address={address} />
            <ModalCancelOrder show={showModalCancelOrder} setShow={setShowModalCancelOrder} item={selectedProduct} />
        </div>
    );
}

export default ManageOrder;
