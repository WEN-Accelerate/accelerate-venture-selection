import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                profile: resolve(__dirname, 'profile.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
                consultant: resolve(__dirname, 'consultant.html'),
                consultant_onboarding: resolve(__dirname, 'consultant-onboarding.html'),
                admin: resolve(__dirname, 'admin.html'),
                ai_admin: resolve(__dirname, 'ai-admin.html'),
            },
        },
    },
})
