import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import request from '../../Config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { IUser } from '../../types';

interface ModalDeleteUserProps {
    show: boolean;
    setShow: (val: boolean) => void;
    dataOneUser: Partial<IUser>;
}

function ModalDeleteUser({ show, setShow, dataOneUser }: ModalDeleteUserProps): JSX.Element {
    const handleClose = () => setShow(false);

    const handleDeleteUser = async (): Promise<void> => {
        try {
            const res = await request.delete<{ message: string }>('/api/deleteuser', { params: { id: dataOneUser._id } });
            toast.success(res.data.message);
            handleClose();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message ?? 'Lỗi');
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton><Modal.Title>Xóa Người Dùng</Modal.Title></Modal.Header>
            <Modal.Body>Bạn Muốn Xóa Người Dùng: {dataOneUser.fullname}</Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Đóng</Button>
                <Button variant="danger" onClick={handleDeleteUser}>Xóa Người Dùng</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ModalDeleteUser;
