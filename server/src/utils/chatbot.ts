import { GoogleGenerativeAI } from '@google/generative-ai';
import ProductModel from '../models/Products';
import { IProductDocument } from '../types/index';
import readSecret from './secret';

const getGenAI = (): GoogleGenerativeAI => {
    const apiKey = readSecret('gemini_api_key', 'GEMINI_API_KEY');
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not defined');
    }
    return new GoogleGenerativeAI(apiKey);
};

const askQuestion = async (question: string): Promise<string> => {
    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const products: IProductDocument[] = await ProductModel.find({});

        const productHTML = products
            .map(
                (product) => `
            <div style="border: 1px solid #ddd; padding: 12px; margin: 8px 0; border-radius: 6px;">
                ${product.img && product.img.length > 0
                        ? `<img src="http://localhost:5001/uploads/${product.img[0]}" alt="${product.name}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px;">`
                        : ''
                    }
                <div>
                    <h3 style="font-size: 14px; margin: 4px 0; font-weight: bold;">${product.name}</h3>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Giá:</strong> ${product.price} VND</p>
                    <a href="http://localhost:3000/product/${product._id}/${product.slug}" target="_blank" style="color: #007bff; font-size: 13px;">Xem sản phẩm</a>
                </div>
            </div>
        `
            )
            .join('');

        const prompt = `
        Bạn là một trợ lý bán hàng chuyên nghiệp.
        Đây là danh sách sản phẩm hiện có trong cửa hàng (hiển thị theo dạng HTML):
        ${productHTML}

        Câu hỏi của khách hàng: "${question}"
        Nếu câu hỏi không liên quan đến sản phẩm, hãy trả lời một cách tự nhiên và thân thiện.
        Hãy trả lời một cách tự nhiên và thân thiện, đồng thời hiển thị kết quả dưới dạng HTML.
        `;

        const result = await model.generateContent(prompt);
        const answer = result.response.text();
        return answer.replace(/```(html|plaintext)?\n?/g, '').trim();
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Lỗi khi xử lý câu hỏi:`, error);
        return "<p style='color: red;'>Xin lỗi, hiện tại tôi không thể xử lý yêu cầu của bạn. Vui lòng thử lại sau!</p>";
    }
};

export { askQuestion };
