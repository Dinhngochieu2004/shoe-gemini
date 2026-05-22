import mongoose, { Schema } from 'mongoose';
import { ICartDocument } from '../types/index';

const CartSchema = new Schema<ICartDocument>(
    {
        user: { type: String, default: '' },
        products: [
            {
                nameProduct: { type: String, default: '' },
                quantity: { type: Number, default: 0 },
                price: { type: Number, default: 0 },
                size: { type: Number, default: 0 },
                img: { type: String, default: '' },
                type: { type: Number, default: 0 },
            },
        ],
        address: { type: String, default: '' },
        name: { type: String, default: '' },
        phone: { type: Number, default: 0 }, // fixed: removed duplicate
        sumprice: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const CartModel = mongoose.model<ICartDocument>('carts', CartSchema, 'Carts');
export default CartModel;
