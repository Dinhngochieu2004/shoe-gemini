import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID as string;
const CLIENT_SECRET = process.env.CLIENT_SECRET as string;
const REDIRECT_URI = process.env.REDIRECT_URI as string;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN as string;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const sendMailOrder = async (email: string): Promise<void> => {
    try {
        const accessToken = await oAuth2Client.getAccessToken();
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken.token ?? undefined,
            },
        });
        await transport.sendMail({
            from: `"NIKE SHOP 🎉" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🎉 Đặt hàng thành công - Chờ nhận hàng nhé!',
            text: 'Cảm ơn bạn đã đặt hàng tại NIKE SHOP!',
            html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #2E86C1;">🎉 Xin chúc mừng, ${email}!</h2>
                <p>Đơn hàng của bạn đã được xác nhận thành công tại <b>NIKE SHOP</b>! 🚀</p>
                <h3 style="color: #28B463;">📦 Trạng thái đơn hàng:</h3>
                <p>✅ Đã tiếp nhận đơn hàng</p>
                <p>🛒 Đang chuẩn bị hàng</p>
                <p>🚚 Sắp giao đến bạn</p>
                <p><b>Thời gian dự kiến giao hàng:</b> <i>Trong vòng 2-5 ngày làm việc</i></p>
                <p>Cảm ơn bạn đã tin tưởng và ủng hộ <b>NIKE SHOP</b>. 💖</p>
                <p style="color: #2E86C1; font-weight: bold;">Trân trọng,<br> Đội ngũ NIKE SHOP</p>
            </div>
            `,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Lỗi gửi email:`, error);
    }
};

export default sendMailOrder;
