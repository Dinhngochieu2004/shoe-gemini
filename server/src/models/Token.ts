import mongoose, { Schema, Types } from 'mongoose';
import { ITokenDocument } from '../types/index';

const tokenSchema = new Schema<ITokenDocument>(
    {
        usersId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        accessToken: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const TokenModel = mongoose.model<ITokenDocument>('tokens', tokenSchema, 'Tokens');
export default TokenModel;
