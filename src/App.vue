<template>
  <div id="app-root" class="flex flex-col min-h-screen bg-gray-100 text-gray-800 font-sans">
    <header
        :class="[
        'p-4 md:p-6 mb-5 bg-white border-b border-gray-200 flex items-center justify-between flex-wrap gap-4',
        {
          'text-primary font-bold': authStore.loading,
          'bg-primary/5 text-primary-dark': authStore.isLoggedIn && !authStore.loading,
          'bg-gray-50 text-gray-600': !authStore.isLoggedIn && !authStore.loading
        }
      ]"
    >
      <div v-if="authStore.loading" class="text-lg">인증 상태 확인 중...</div>
      <div v-else-if="authStore.isLoggedIn" class="flex items-center justify-between w-full flex-wrap gap-y-2 gap-x-4">
        <p class="text-base md:text-lg font-medium">환영합니다, <strong class="text-primary-dark">{{ authStore.currentUserEmail?.split('@')[0] }}</strong>님!</p>
        <div class="flex items-center gap-2 ml-auto">
          <button
              @click="openSummaryModal"
              class="px-3 py-2 md:px-4 md:py-2 rounded-lg bg-white border border-primary text-primary-dark text-sm md:text-base font-semibold hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-75 transition-colors duration-200 whitespace-nowrap"
          >
            미처리 현황
          </button>
          <button
              @click="handleLogout"
              class="px-3 py-2 md:px-4 md:py-2 rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-sm md:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 duration-200 whitespace-nowrap"
          >
            로그아웃
          </button>
        </div>
      </div>
      <div v-else class="flex flex-col items-start gap-4 w-full">
        <p class="text-lg font-medium">로그인이 필요합니다.</p>
        <button @click="handleLogin" class="px-5 py-2 bg-primary text-white rounded-lg text-base font-bold cursor-pointer transition duration-300 ease-in-out whitespace-nowrap hover:bg-primary-dark hover:translate-y-px">
          Google 계정으로 로그인
        </button>
        <p v-if="authStore.error" class="text-red-600 font-bold mt-2 w-full text-center">{{ authStore.error }}</p>
      </div>
    </header>

    <main v-if="authStore.isLoggedIn" class="flex flex-col lg:flex-row items-start w-full gap-5 px-5 md:px-8 flex-grow">
      <ReceiptUploader class="flex-grow w-full lg:w-auto" />
      <ExpenseList class="flex-grow w-full lg:w-auto" />
    </main>
    <SummaryModal v-if="summaryModalOpen" :summary-data="summaryData" @close="closeSummaryModal" />
  </div>
</template>

<script setup lang="ts">
import { watch, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useAuthStore } from './stores/authStore';
import { useExpenseStore } from './stores/expenseStore';
import ExpenseList from "./components/ExpenseList.vue";
import ReceiptUploader from "./components/ReceiptUploader.vue";
import SummaryModal from "./components/SummaryModal.vue";

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

const summaryModalOpen = ref(false);
const summaryData = ref<Record<string, number>>({}); // 요약 데이터를 저장할 ref

const openSummaryModal = async () => {
  summaryData.value = await expenseStore.getUnprocessedSummary();
  summaryModalOpen.value = true;
};

const closeSummaryModal = () => {
  summaryModalOpen.value = false;
};

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
  // One Tap 초기화: 현재 비로그인 상태에서 자동 프롬프트 시도
  authStore.initializeGoogleOneTap();

  unsubscribeFromExpenseActions = expenseStore.$onAction(({ name, after, onError }) => {
    if (['updateExpenseStatus', 'deleteExpense', 'updateExpenseField'].includes(name)) {
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
