import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import request from '../../Config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ModalEditOrderProps {
    show: boolean;
    setShow: (val: boolean) => void;
    id: string;
    address: string;
}

function ModalEditOrder({ show, setShow, id, address }: ModalEditOrderProps): JSX.Element {
    const handleClose = () => setShow(false);
    const [valueOption, setValueOption] = useState(0);

    const handleEditOrder = (): void => {
        request.post<{ message: string }>('/api/editorder', { valueOption, id }).then((res) => {
            toast.success(res.data.message);
        });
        setValueOption(0);
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Chỉnh Sửa Đơn Hàng</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <span>Bạn muốn gửi đơn hàng đến: {address}</span>
                <select className="form-select mt-3" onChange={(e) => setValueOption(Number(e.target.value))} value={valueOption}>
                    <option value={0}>Đang vận chuyển</option>
                    <option value={1}>Đã Giao Hàng</option>
                </select>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Đóng</Button>
                <Button variant="primary" onClick={handleEditOrder}>Lưu lại</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ModalEditOrder;
