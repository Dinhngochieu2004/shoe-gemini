import classNames from 'classnames/bind';
import styles from '../Styles/Pagination.module.scss';
import PaginationPage from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import React from 'react';

const cx = classNames.bind(styles);

interface PaginationProps {
    page: number;
    totalPages: number;
    handlePageChange: (event: React.ChangeEvent<unknown>, value: number) => void;
}

function Pagination({ page, totalPages, handlePageChange }: PaginationProps): JSX.Element {
    return (
        <div className={cx('wrapper')}>
            <Stack spacing={1}>
                <PaginationPage color="primary" count={totalPages} page={page} onChange={handlePageChange} />
            </Stack>
        </div>
    );
}

export default Pagination;
