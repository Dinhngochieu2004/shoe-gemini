import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/Admin.module.scss';
import 'react-toastify/dist/ReactToastify.css';
import SlideBar from './Admin/SlideBar/SlideBar';
import HomePage from './Admin/HomePage/HomePage';
import { requestAdmin } from '../Config/api';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

const Admin = (): JSX.Element | null => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [checkTypeSlideBar, setCheckTypeSlideBar] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            try {
                await requestAdmin();
                document.title = 'Quản Trị Admin';
            } catch (error) {
                navigate('/');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    if (isLoading) return null;

    return (
        <div className={cx('wrapper')}>
            <div className={cx('slidebar')}>
                <SlideBar setCheckTypeSlideBar={setCheckTypeSlideBar} checkTypeSlideBar={checkTypeSlideBar} />
            </div>
            <div className={cx('home-page')}>
                <HomePage checkTypeSlideBar={checkTypeSlideBar} />
            </div>
        </div>
    );
};

export default Admin;
