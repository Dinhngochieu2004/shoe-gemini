import request from '../../Config/api';
import { IAddToCartParams } from '../../types';

const AddToCartProduct = async (
    props: IAddToCartParams,
    quantity: number,
    selectSize: string | number
): Promise<{ data: { message: string } } | undefined> => {
    const token = document.cookie;
    if (!token) return undefined;

    try {
        const { img, name, price, type } = props;
        const res = await request.post<{ message: string }>('/api/addtocart', {
            nameProduct: name,
            imgProduct: img[0],
            priceProduct: price,
            quantityProduct: quantity,
            size: selectSize,
            sumprice: price * quantity,
            type,
        });
        return res;
    } catch (error) {
        console.log(error);
        return undefined;
    }
};

export default AddToCartProduct;
