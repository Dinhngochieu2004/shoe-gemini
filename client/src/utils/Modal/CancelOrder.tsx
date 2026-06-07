import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import request from '../../Config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ModalCancelOrderProps {
    show: boolean;
    setShow: (val: boolean) => void;
    item: string;
}

function ModalCancelOrder({ show, setShow, item }: ModalCancelOrderProps): JSX.Element {
    const handleClose = () => setShow(false);

    const handleDeletePro = async (): Promise<void> => {
        try {
            const res = await request.post<{ message: string }>('/api/cancelorder', { id: item });
            toast.success(res.data.message);
            handleClose();
        } catch {
            toast.error('Hủy đơn hàng thất bại, vui lòng thử lại!');
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton><Modal.Title>Hủy Đơn Hàng</Modal.Title></Modal.Header>
            <Modal.Body>Bạn Muốn Hủy Đơn Hàng?</Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Đóng</Button>
                <Button variant="primary" onClick={handleDeletePro}>Hủy Đơn Hàng</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ModalCancelOrder;
