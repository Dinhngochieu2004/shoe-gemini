import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import request from '../../Config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { IProduct } from '../../types';

interface ModalDeleteProProps {
    show: boolean;
    setShow: (val: boolean) => void;
    nameProduct: Partial<IProduct>;
}

function ModalDeletePro({ show, setShow, nameProduct }: ModalDeleteProProps): JSX.Element {
    const handleClose = () => setShow(false);

    const handleDeletePro = async (): Promise<void> => {
        try {
            const res = await request.delete<{ message: string }>('/api/deleteproduct', { params: { id: nameProduct._id } });
            toast.success(res.data.message);
            handleClose();
        } catch (error) { handleClose(); }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton><Modal.Title>Xóa Sản Phẩm</Modal.Title></Modal.Header>
            <Modal.Body>Bạn Muốn Xóa Sản Phẩm: {nameProduct.name}</Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Đóng</Button>
                <Button variant="primary" onClick={handleDeletePro}>Xóa Sản Phẩm</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ModalDeletePro;
