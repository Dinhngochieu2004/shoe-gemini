import Modal from 'react-bootstrap/Modal';
import imgSelectSize from '../../assests/imgs/Bang-size-KID.webp';
import selectSizeName from '../../assests/imgs/chon-size-3.webp';
import selectSizeName1 from '../../assests/imgs/chon-size-2.webp';
import { IProduct } from '../../types';

interface SelectSizeProps {
    dataProduct: IProduct[];
    show: boolean;
    setShow: (val: boolean) => void;
}

function SelectSize({ dataProduct, show, setShow }: SelectSizeProps): JSX.Element {
    const handleClose = () => setShow(false);

    return (
        <Modal show={show} onHide={handleClose}>
            {dataProduct.map((item, index) => (
                <div key={index}>
                    {item.type === 1 || item.type === 2 ? (
                        <div style={{ width: '500px' }}>
                            <img style={{ width: '100%' }} src={selectSizeName} alt="Size guide" />
                            <img style={{ width: '100%' }} src={selectSizeName1} alt="Size guide" />
                        </div>
                    ) : (
                        <div style={{ width: '500px' }}>
                            <img style={{ width: '100%' }} src={imgSelectSize} alt="Size guide kids" />
                        </div>
                    )}
                </div>
            ))}
        </Modal>
    );
}

export default SelectSize;
