import mongoose, { Schema } from 'mongoose';
import { IPaymentDocument } from '../types/index';

const PaymentSchema = new Schema<IPaymentDocument>(
    {
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
        sumprice: { type: Number, default: 0 },
        tinhtrang: { type: Boolean, default: false },
        trangthai: { type: Boolean, default: false },
        phone: { type: Number, default: 0 },
        user: { type: String, default: '' },
        address: { type: String, default: '' },
        size: { type: Number, default: 0 },
        username: { type: String },
    },
    { timestamps: true }
);

const PaymentModel = mongoose.model<IPaymentDocument>('payments', PaymentSchema, 'Payments');
export default PaymentModel;
