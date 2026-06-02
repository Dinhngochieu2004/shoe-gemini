import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { publicRoute } from './Route';
import { Provider } from './store/Provider';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <Provider>
            <Router>
                <Routes>
                    {publicRoute.map((route, index) => (
                        <Route key={index} path={route.path} element={route.element} />
                    ))}
                </Routes>
            </Router>
        </Provider>
    </React.StrictMode>,
);

