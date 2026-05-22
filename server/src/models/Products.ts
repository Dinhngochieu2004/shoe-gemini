import mongoose, { Schema } from 'mongoose';
import { IProductDocument } from '../types/index';

const ProductSchema = new Schema<IProductDocument>(
    {
        img: [{ type: String, default: '' }],
        name: { type: String, default: '' },
        price: { type: Number, default: 0 },
        slug: { type: String, default: '' },
        description: { type: String, default: '' },
        type: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const ProductModel = mongoose.model<IProductDocument>('products', ProductSchema, 'Products');
export default ProductModel;
