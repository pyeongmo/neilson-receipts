<template>
  <div id="app-root">
    <header :class="['auth-header', {
      'auth-header--loading': authStore.loading,
      'auth-header--logged-in': authStore.isLoggedIn && !authStore.loading,
      'auth-header--logged-out': !authStore.isLoggedIn && !authStore.loading
    }]">
      <div v-if="authStore.loading" class="auth-message">인증 상태 확인 중...</div>
      <div v-else-if="authStore.isLoggedIn" class="auth-header__content--logged-in"> <p class="auth-message">환영합니다, <strong>{{ authStore.currentUserEmail }}</strong>님!</p>
        <button @click="handleLogout" class="action-button action-button--danger">로그아웃</button>
      </div>
      <div v-else>
        <p class="auth-message">로그인이 필요합니다.</p>
        <button @click="handleLogin" class="action-button action-button--primary">Google 계정으로 로그인</button>
        <p v-if="authStore.error" class="auth-message auth-message--error">{{ authStore.error }}</p>
      </div>
    </header>

    <main v-if="authStore.isLoggedIn" class="main-content-wrapper">
      <ReceiptUploader class="flex-item" />
      <ExpenseList class="flex-item" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from './stores/authStore';
import { useExpenseStore } from './stores/expenseStore';
import ExpenseList from "./components/ExpenseList.vue";
import ReceiptUploader from "./components/ReceiptUploader.vue";

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

let savedWindowScrollPosition: number = 0;
let unsubscribeFromExpenseActions: (() => void) | null = null;

const saveWindowScrollPosition = () => {
  savedWindowScrollPosition = window.scrollY;
  console.log('App.vue: Window scroll position saved:', savedWindowScrollPosition);
};

const restoreWindowScrollPosition = () => {
  if (savedWindowScrollPosition > 0) {
    nextTick(() => {
      window.scrollTo(0, savedWindowScrollPosition);
      console.log('App.vue: Window scroll position restored to:', savedWindowScrollPosition);
      savedWindowScrollPosition = 0;
    });
  }
};

const handleLogin = async () => {
  saveWindowScrollPosition();
  await authStore.loginWithGoogle();
};

const handleLogout = async () => {
  saveWindowScrollPosition();
  await authStore.logout();
};

watch(() => authStore.loading, (newLoading) => {
  if (!newLoading) {
    restoreWindowScrollPosition();
  }
});

watch(() => expenseStore.loading, (newLoading) => {
  if (!newLoading) {
    restoreWindowScrollPosition();
  }
}, { immediate: true });

onMounted(() => {
  unsubscribeFromExpenseActions = expenseStore.$onAction(({ name, after, onError }) => {
    if (['toggleExpenseProcessedStatus', 'deleteExpense', 'updateExpenseField'].includes(name)) {
      saveWindowScrollPosition();
    }
    after(() => {
      // restore logic is handled by watch(expenseStore.loading)
    });
    onError((error) => {
      console.error(`Error during action "${name}":`, error);
    });
  }, true);
});

onUnmounted(() => {
  if (unsubscribeFromExpenseActions) {
    unsubscribeFromExpenseActions();
  }
});
</script>

<style>
/* 전역 스타일 */
body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f2f5;
  color: #333;
}

h2, h3 {
  margin: 0;
}

#app-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>

<style scoped>
/* 인증 헤더 스타일 */
.auth-header {
  padding: 20px 30px;
  margin-bottom: 20px;
  background-color: #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between; /* 기본적으로 좌우 끝으로 분산 */
  flex-wrap: wrap;
  gap: 15px;
}

/* 로그인 상태일 때의 헤더 내부 콘텐츠 정렬 */
.auth-header__content--logged-in {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 메시지와 버튼을 좌우 끝으로 분산 */
  width: 100%; /* 부모 너비를 모두 사용 */
  flex-wrap: wrap; /* 작은 화면에서 줄바꿈되도록 */
  gap: 15px;
}

.auth-header--loading {
  font-weight: bold;
  color: #007bff;
}

.auth-header--logged-in {
  background-color: #e9f7ef;
  color: #28a745;
}

.auth-header--logged-out {
  background-color: #f8f9fa;
  color: #6c757d;
}

/* 메시지 스타일 */
.auth-message {
  margin: 0;
  font-size: 1.1em;
  font-weight: 500;
  flex-grow: 1; /* 메시지가 가능한 한 많은 공간을 차지하도록 */
}

.auth-message strong {
  color: #1a73e8;
}

.auth-message--error {
  color: #dc3545;
  font-weight: bold;
  margin-top: 10px;
  width: 100%;
  text-align: center;
}

/* 액션 버튼 스타일 */
.action-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
  white-space: nowrap;
}

.action-button--primary { /* Google 로그인 버튼 */
  background-color: #1a73e8;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.action-button--primary:hover {
  background-color: #155bb3;
  transform: translateY(-1px);
}

.action-button--danger { /* 로그아웃 버튼 */
  background-color: #dc3545;
  color: white;
}

.action-button--danger:hover {
  background-color: #c82333;
  transform: translateY(-1px);
}

/* 주요 콘텐츠 래퍼 */
.main-content-wrapper {
  display: flex;
  align-items: flex-start;
  width: 100%;
  gap: 20px;
  padding: 0 30px;
  box-sizing: border-box;
  flex-grow: 1;
}

/* 각 flex 아이템에 대한 스타일 */
.flex-item {
  flex-grow: 1;
}

@media (max-width: 1000px) {
  .auth-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .auth-header__content--logged-in {
    flex-direction: column; /* 로그인 헤더 내부도 컬럼으로 */
    align-items: flex-start;
  }
  .main-content-wrapper {
    flex-direction: column;
    padding: 0 15px;
  }
  .flex-item {
    width: 100%;
  }
}
</style>
