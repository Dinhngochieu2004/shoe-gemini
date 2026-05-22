import { useEffect, useState } from 'react';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FeatureGrid from './Components/FeatureGrid';
import Footer from './Components/Footer';
import Header from './Components/Header';
import ProductsTab from './Components/ProductsTab';
import Slider from './Components/Slider';
import request from './Config/api';
import Chatbot from './utils/Chatbot/Chatbot';
import { IProduct } from './types';

function App(): JSX.Element {
    const [dataProducts, setDataProducts] = useState<IProduct[]>([]);

    useEffect(() => {
        request.get<IProduct[]>('/api/products').then((res) => setDataProducts(res.data));
    }, []);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <div className="App">
            <ToastContainer />
            <header><Header /></header>
            <main>
                <Chatbot />
                <Slider />
                <ProductsTab dataProducts={dataProducts} />
                <FeatureGrid />
            </main>
            <footer><Footer /></footer>
        </div>
    );
}

export default App;
