<template>
  <div>
    <div v-if="authStore.loading">인증 상태 확인 중...</div>
    <div v-else-if="authStore.isLoggedIn">
      <p>환영합니다, {{ authStore.currentUserEmail }}님!</p>
      <button @click="handleLogout">로그아웃</button>
      <div class="wrapper">
        <ReceiptUploader style="flex-grow: 1" />
        <ExpenseList style="flex-grow: 1" />
      </div>
    </div>
    <div v-else>
      <p>로그인이 필요합니다.</p>
      <button @click="handleLogin">Google 계정으로 로그인</button>
      <p v-if="authStore.error" style="color: red;">{{ authStore.error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from './stores/authStore';
import ExpenseList from "./components/ExpenseList.vue";
import ReceiptUploader from "./components/ReceiptUploader.vue";

const authStore = useAuthStore();

const handleLogin = async () => {
  await authStore.loginWithGoogle();
};

const handleLogout = async () => {
  await authStore.logout();
};
</script>

<style>
h2,h3 {
  margin: 0;
}
</style>

<style scoped>
.wrapper {
  display: flex;
  place-items: flex-start;
}
@media (max-width: 1000px) {
  .wrapper {
    flex-direction: column;
  }
}
</style>
