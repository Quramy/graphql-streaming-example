import type {} from 'react-dom/experimental';
import { unstable_createRoot as createRoot } from 'react-dom';

import App from './components/app';

const elm = document.getElementById('app')!;
createRoot(elm).render(<App />);
