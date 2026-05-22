import mongoose, { Schema } from 'mongoose';
import { IUserDocument } from '../types/index';

const UserSchema = new Schema<IUserDocument>(
    {
        fullname: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        isAdmin: { type: Boolean, default: false },
        phone: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const UserModel = mongoose.model<IUserDocument>('users', UserSchema, 'Users');
export default UserModel;
