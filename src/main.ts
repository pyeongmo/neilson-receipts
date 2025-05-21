// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { useAuthStore } from './stores/authStore'; // authStore 임포트

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// Pinia 스토어 인스턴스 가져오기
const authStore = useAuthStore();
// Firebase Auth 상태 리스너 초기화
authStore.initializeAuthListener();

app.mount('#app');
