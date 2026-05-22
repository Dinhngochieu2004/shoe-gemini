import { useEffect, useState } from 'react';
import request from '../Config/api';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import classNames from 'classnames/bind';
import styles from '../Styles/ManagerUser.module.scss';
import Pagination from './Pagination';
import ModalDeleteUser from '../utils/Modal/ModalDeleteUser';
import { IUser } from '../types';
import React from 'react';

const cx = classNames.bind(styles);

function ManagerUser(): JSX.Element {
    const [dataAllUser, setDataAllUser] = useState<IUser[]>([]);
    const [dataOneUser, setDataOneUser] = useState<Partial<IUser>>({});
    const [show, setShow] = useState(false);
    const [page, setPage] = useState(1);

    const productsPerPage = 10;
    const startIndex = (page - 1) * productsPerPage;
    const totalPages = Math.ceil(dataAllUser.length / productsPerPage);
    const currentProducts = dataAllUser.slice(startIndex, startIndex + productsPerPage);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number): void => { setPage(value); };

    useEffect(() => {
        const fetchData = async () => {
            const res = await request.get<IUser[]>('/api/getalluser');
            setDataAllUser(res.data);
        };
        fetchData();
    }, [show]);

    const showModalDeleteUser = (user: IUser): void => {
        setShow(true);
        setDataOneUser(user);
    };

    return (
        <div className="table-responsive">
            <h4>Quản Lý Người Dùng</h4>
            <ToastContainer />
            <table className="table table-bordered border-primary table-hover mt-3">
                <thead>
                    <tr>
                        <th>ID</th><th>Tên Người Dùng</th><th>Email</th>
                        <th>Số Điện Thoại</th><th>Chức Vụ</th><th>Hành Động</th>
                    </tr>
                </thead>
                <tbody>
                    {currentProducts.map((user) => (
                        <tr key={user._id}>
                            <th scope="row">{user._id.slice(0, 5)}</th>
                            <td>{user.fullname}</td>
                            <td>{user.email}</td>
                            <td>0{user.phone}</td>
                            <td>{user.isAdmin ? 'Quản Trị Viên' : 'Người Dùng'}</td>
                            <td>
                                <button onClick={() => showModalDeleteUser(user)} type="button" className="btn btn-danger">
                                    Xóa Người Dùng
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className={cx('pagination')}>
                <Pagination page={page} totalPages={totalPages} handlePageChange={handlePageChange} />
                <ModalDeleteUser show={show} setShow={setShow} dataOneUser={dataOneUser} />
            </div>
        </div>
    );
}

export default ManagerUser;
