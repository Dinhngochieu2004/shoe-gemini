import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import readSecret from '../utils/secret';

const ForgotPassword = async (email: string, token: string, otp: string): Promise<void> => {
    try {
        const CLIENT_ID = readSecret('email_client_id', 'CLIENT_ID') as string;
        const CLIENT_SECRET = readSecret('email_client_secret', 'CLIENT_SECRET') as string;
        const REDIRECT_URI = readSecret('email_redirect_uri', 'REDIRECT_URI') as string;
        const REFRESH_TOKEN = readSecret('email_refresh_token', 'REFRESH_TOKEN') as string;
        const EMAIL_USER = readSecret('email_user', 'EMAIL_USER') as string;

        const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

        const accessToken = await oAuth2Client.getAccessToken();
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: EMAIL_USER,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken.token ?? undefined,
            },
        });
        await transport.sendMail({
            from: `"GLAB" <${EMAIL_USER}>`,
            to: email,
            subject: '🔐 Khôi phục mật khẩu - GLAB',
            html: `
                <div style="max-width: 500px; margin: auto; font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; border-radius: 10px; border: 1px solid #ddd;">
                    <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0px 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; text-align: center;">Khôi phục mật khẩu</h2>
                        <p style="color: #555; font-size: 16px;">Xin chào <strong>${email}</strong>,</p>
                        <p style="color: #555; font-size: 16px;">Bạn vừa yêu cầu đặt lại mật khẩu. Dưới đây là mã OTP của bạn:</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <span style="display: inline-block; font-size: 22px; font-weight: bold; color: #d63384; background: #ffe8f0; padding: 10px 20px; border-radius: 5px;">${otp}</span>
                        </div>
                        <p style="color: #555; font-size: 16px;">Token xác thực của bạn:</p>
                        <div style="text-align: center; margin: 10px 0;">
                            <span style="display: inline-block; font-size: 14px; color: #333; background: #eee; padding: 8px 15px; border-radius: 5px;">${token}</span>
                        </div>
                        <p style="color: #999; font-size: 14px; text-align: center;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
                    </div>
                    <div style="text-align: center; font-size: 12px; color: #888; margin-top: 20px;">
                        <p>© 2025 GLAB. All rights reserved.</p>
                    </div>
                </div>
            `,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending forgot password email:`, error);
    }
};

export default ForgotPassword;
