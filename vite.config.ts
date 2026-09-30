import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const proxy = { '/api/local': { target: 'http://127.0.0.1:8765', changeOrigin: true } };
export default defineConfig({ plugins: [react()], server: { proxy }, preview: { proxy } });
