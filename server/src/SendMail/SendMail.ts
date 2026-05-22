import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import readSecret from '../utils/secret';

const CLIENT_ID = readSecret('email_client_id', 'CLIENT_ID') as string;
const CLIENT_SECRET = readSecret('email_client_secret', 'CLIENT_SECRET') as string;
const REDIRECT_URI = readSecret('email_redirect_uri', 'REDIRECT_URI') as string;
const REFRESH_TOKEN = readSecret('email_refresh_token', 'REFRESH_TOKEN') as string;
const EMAIL_USER = readSecret('email_user', 'EMAIL_USER') as string;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const sendMail = async (email: string): Promise<void> => {
    try {
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
            from: `"GLAB 👻" <${EMAIL_USER}>`,
            to: email,
            subject: 'Thanks',
            text: 'Hello world?',
            html: `<b>
            Dear ${email}
            Alibarbie sincerely thanks you for choosing to trust and purchase our products.
            </b>`,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending email:`, error);
    }
};

export default sendMail;
