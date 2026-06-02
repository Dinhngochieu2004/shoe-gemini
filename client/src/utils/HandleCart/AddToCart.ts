import request from '../../Config/api';
import cookies from 'js-cookie';
import { IAddToCartParams } from '../../types';

const AddToCartProduct = async (
    props: IAddToCartParams,
    quantity: number,
    selectSize: string | number
): Promise<{ data: { message: string } } | undefined> => {
    if (cookies.get('logged') !== '1') return undefined;

    try {
        const { img, name, price, type } = props;
        const res = await request.post<{ message: string }>('/api/addtocart', {
            nameProduct: name,
            imgProduct: img[0],
            priceProduct: price,
            quantityProduct: quantity,
            size: selectSize,
            type,
        });
        return res;
    } catch (error) {
        console.log(error);
        return undefined;
    }
};

export default AddToCartProduct;
