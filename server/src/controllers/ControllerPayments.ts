import axios from 'axios';
import crypto from 'crypto';
import { Request, Response } from 'express';
import CartModel from '../models/Cart';
import PaymentModel from '../models/Payment';
import UserModel from '../models/User';
import sendMailOrder from '../SendMail/SendMailOrder';
import { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat, HashAlgorithm, ReturnQueryFromVNPay } from 'vnpay';
import readSecret from '../utils/secret';

class ControllerPayments {
    // FIX: use req.user from verifyToken middleware instead of jwtDecode(cookie)
    async PaymentsMomo(req: Request, res: Response): Promise<Response> {
        try {
            const email = req.user!.email;

            const dataCart = await CartModel.findOne({ user: email });
            if (!dataCart) return res.status(404).json({ message: 'Please add product to cart' });
            if (!dataCart.address || !dataCart.name || !dataCart.phone) {
                return res.status(403).json({ message: 'Bạn đang thiếu thông tin' });
            }

            const { address } = req.body as { address: string };
            if (!address) return res.status(400).json({ message: 'Address is required' });

            // FIX: use env variables instead of hardcoded credentials
            const partnerCode = 'MOMO';
            const accessKey = readSecret('momo_access_key', 'MOMO_ACCESS_KEY') as string;
            const secretKey = readSecret('momo_secret_key', 'MOMO_SECRET_KEY') as string;
            const requestId = partnerCode + new Date().getTime();
            const orderId = requestId;
            const orderInfo = email;
            const redirectUrl = `${process.env.SERVER_URL ?? 'http://localhost:5001'}/api/checkdata`;
            const ipnUrl = `${process.env.SERVER_URL ?? 'http://localhost:5001'}/api/checkdata`;
            const amount = dataCart.sumprice;
            const requestType = 'captureWallet';
            const extraData = address;

            const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

            const requestBody = {
                partnerCode, accessKey, requestId, amount, orderId, orderInfo,
                redirectUrl, ipnUrl, extraData, requestType, signature, lang: 'en',
            };

            const response = await axios.post(
                'https://test-payment.momo.vn/v2/gateway/api/create',
                requestBody,
                { headers: { 'Content-Type': 'application/json' } }
            );
            return res.status(200).json(response.data);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] MoMo payment error:`, error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    async paymentVnpay(req: Request, res: Response): Promise<Response> {
        try {
            const email = req.user!.email;

            const dataCart = await CartModel.findOne({ user: email });
            if (!dataCart) return res.status(404).json({ message: 'Please add product to cart' });
            if (!dataCart.address || !dataCart.name || !dataCart.phone) {
                return res.status(403).json({ message: 'Bạn đang thiếu thông tin' });
            }

            const vnpay = new VNPay({
                tmnCode: readSecret('vnpay_tmn_code', 'VNPAY_TMN_CODE') as string,
                secureSecret: readSecret('vnpay_secure_secret', 'VNPAY_SECURE_SECRET') as string,
                vnpayHost: 'https://sandbox.vnpayment.vn',
                testMode: true,
                hashAlgorithm: 'SHA512' as HashAlgorithm,
                loggerFn: ignoreLogger,
            });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const vnpayResponse = await vnpay.buildPaymentUrl({
                vnp_Amount: dataCart.sumprice,
                vnp_IpAddr: '127.0.0.1',
                vnp_TxnRef: String(dataCart._id),
                vnp_OrderInfo: String(dataCart._id),
                vnp_OrderType: ProductCode.Other,
                vnp_ReturnUrl: `${process.env.SERVER_URL ?? 'http://localhost:5001'}/api/check-payment-vnpay`,
                vnp_Locale: VnpLocale.VN,
                vnp_CreateDate: dateFormat(new Date()),
                vnp_ExpireDate: dateFormat(tomorrow),
            });

            return res.status(201).json({ vnpayResponse });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] VNPay payment error:`, error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    async checkPaymentVnpay(req: Request, res: Response): Promise<void> {
        const redirectPayments = `${process.env.REACT_APP_URL_DOMAIN ?? 'http://localhost'}/payments`;
        const redirectSuccess = `${process.env.REACT_APP_URL_DOMAIN ?? 'http://localhost'}/paymentsuccess`;
        try {
            const vnpay = new VNPay({
                tmnCode: readSecret('vnpay_tmn_code', 'VNPAY_TMN_CODE') as string,
                secureSecret: readSecret('vnpay_secure_secret', 'VNPAY_SECURE_SECRET') as string,
                vnpayHost: 'https://sandbox.vnpayment.vn',
                testMode: true,
                hashAlgorithm: 'SHA512' as HashAlgorithm,
                loggerFn: ignoreLogger,
            });

            const verify = vnpay.verifyReturnUrl(req.query as unknown as ReturnQueryFromVNPay);
            if (!verify.isSuccess || !verify.vnp_OrderInfo) {
                res.redirect(redirectPayments);
                return;
            }

            const findCart = await CartModel.findOne({ _id: verify.vnp_OrderInfo });
            if (!findCart) {
                res.redirect(redirectPayments);
                return;
            }

            const newPayment = new PaymentModel({
                products: findCart.products,
                address: findCart.address,
                phone: findCart.phone,
                username: findCart.name,
                sumprice: findCart.sumprice,
                tinhtrang: false,
                trangthai: true,
                user: findCart.user,
            });
            await sendMailOrder(findCart.user);
            await newPayment.save();
            await findCart.deleteOne();
            res.redirect(redirectSuccess);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] checkPaymentVnpay error:`, error);
            res.redirect(redirectPayments);
        }
    }

    async checkData(req: Request, res: Response): Promise<void> {
        try {
            const { orderInfo: email, amount, extraData: address, resultCode } = req.query as {
                orderInfo?: string;
                amount?: string;
                extraData?: string;
                resultCode?: string;
            };

            if (resultCode === '1006') {
                res.redirect(`${process.env.REACT_APP_URL_DOMAIN ?? 'http://localhost:3000'}/payments`);
                return;
            }

            if (!email) {
                res.status(400).json({ message: 'Invalid order info' });
                return;
            }

            const cart = await CartModel.findOne({ user: email });
            const dataUser = await UserModel.findOne({ email });

            if (!cart || cart.products.length === 0) {
                res.status(404).json({ message: 'Cart is empty or not found' });
                return;
            }

            const newPayment = new PaymentModel({
                products: cart.products.map((product) => ({
                    nameProduct: product.nameProduct,
                    quantity: product.quantity,
                    price: product.price,
                    size: product.size,
                    img: product.img,
                    type: product.type,
                })),
                sumprice: Number(amount),
                tinhtrang: false,
                trangthai: true,
                user: email,
                address: address ?? '',
                phone: cart.phone,
                username: dataUser?.fullname ?? '',
            });

            await sendMailOrder(email);
            await newPayment.save();
            await CartModel.deleteOne({ user: email });

            res.redirect(`${process.env.REACT_APP_URL_DOMAIN ?? 'http://localhost:3000'}/paymentsuccess`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] checkData error:`, error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    async getPayment(req: Request, res: Response): Promise<Response> {
        try {
            const email = req.user!.email;
            const data = await PaymentModel.findOne({ user: email }).sort({ _id: 'desc' });
            if (!data) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
            return res.status(200).json([data]);
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    async PaymentCod(req: Request, res: Response): Promise<Response> {
        try {
            const email = req.user!.email;

            const cart = await CartModel.findOne({ user: email });
            if (!cart || cart.products.length === 0) {
                return res.status(404).json({ message: 'Cart is empty' });
            }
            if (!cart.address || !cart.name || !cart.phone) {
                return res.status(403).json({ message: 'Bạn đang thiếu thông tin' });
            }

            const sumprice = cart.products.reduce(
                (total, product) => total + product.price * product.quantity,
                0
            );
            const dataUser = await UserModel.findOne({ email });

            const newPayment = new PaymentModel({
                products: cart.products.map((product) => ({
                    nameProduct: product.nameProduct,
                    quantity: product.quantity,
                    price: product.price,
                    size: product.size,
                    img: product.img,
                    type: product.type,
                })),
                sumprice,
                tinhtrang: false,
                trangthai: false,
                user: email,
                address: cart.address,
                phone: cart.phone,
                username: dataUser?.fullname ?? '',
            });

            await sendMailOrder(email);
            await newPayment.save();
            await CartModel.deleteOne({ user: email });
            return res.status(200).json({ message: 'Thanh Toán Thành Công !!!' });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] COD payment error:`, error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    async getPayments(req: Request, res: Response): Promise<Response> {
        try {
            const email = req.user!.email;
            const data = await PaymentModel.find({ user: email });
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    async GetOrderUser(req: Request, res: Response): Promise<Response> {
        try {
            const email = req.user!.email;
            const data = await PaymentModel.find({ user: email }).sort({ _id: -1 });
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    async CancelOrder(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.body as { id: string };
            const email = req.user!.email;
            const order = await PaymentModel.findOne({ _id: id });
            if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
            if (order.user !== email) return res.status(403).json({ message: 'Bạn không có quyền hủy đơn hàng này' });
            await PaymentModel.deleteOne({ _id: id });
            return res.status(200).json({ message: 'Hủy đơn hàng thành công !!!' });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

export default new ControllerPayments();
