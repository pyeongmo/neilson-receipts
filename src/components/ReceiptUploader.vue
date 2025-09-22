<template>
  <div class="max-w-md mx-auto my-10 p-8 rounded-lg shadow-lg bg-white text-center box-border">
    <h2 class="text-3xl font-semibold text-gray-800 mb-6">영수증 업로드</h2>

    <div v-if="!authStore.isLoggedIn && !authStore.loading" class="p-4 rounded-lg mb-5 text-yellow-800 bg-yellow-100 border border-yellow-300">
      <p class="text-base">⚠️ 영수증을 업로드하려면 먼저 로그인해야 합니다.</p>
      <button @click="authStore.loginWithGoogle()" :disabled="authStore.loading" class="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-base font-bold cursor-pointer transition duration-300 ease-in-out whitespace-nowrap hover:bg-blue-700 hover:translate-y-px shadow-md">
        Google 로그인
      </button>
    </div>
    <div v-else-if="authStore.loading" class="p-4 text-gray-600 italic">
      <p>사용자 인증 상태 확인 중...</p>
    </div>

    <div v-else class="flex flex-col gap-5 items-center">
      <label for="receipt-input" class="inline-flex items-center justify-center p-4 md:p-5 bg-green-500 text-white rounded-lg cursor-pointer text-lg font-bold transition duration-300 ease-in-out w-full box-border shadow-md hover:bg-green-600 hover:translate-y-[-2px]">
        <input
            type="file"
            id="receipt-input"
            accept="image/*"
            capture="camera"
            @change="handleFileChange"
            :disabled="expenseStore.uploading"
            class="hidden"
        />
        <span class="flex items-center">
          <i class="fas fa-camera mr-3 text-xl"></i> 사진 촬영 또는 파일 선택
        </span>
      </label>

      <div v-if="previewImage" class="mt-2 p-4 border border-gray-200 rounded-lg w-full box-border bg-gray-50">
        <h3 class="text-base text-gray-700 mb-2">미리보기:</h3>
        <img :src="previewImage" alt="영수증 미리보기" class="max-w-full h-auto rounded-md shadow-md block mx-auto" />
      </div>

      <button
          @click="uploadSelectedFile"
          :disabled="!selectedFile || expenseStore.uploading"
          class="px-5 py-3 bg-blue-600 text-white rounded-lg text-lg font-bold cursor-pointer transition duration-300 ease-in-out w-full box-border shadow-md
                 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none hover:enabled:bg-blue-700 hover:enabled:translate-y-[-2px]"
      >
        <span v-if="!expenseStore.uploading">업로드</span>
        <span v-else>업로드 중 ({{ Math.floor(expenseStore.uploadProgress) }}%)</span>
      </button>

      <div v-if="expenseStore.uploading" class="w-full bg-gray-200 rounded-md h-2.5 overflow-hidden mt-2">
        <div class="h-full bg-green-500 rounded-md transition-all duration-300 ease-in-out" :style="{ width: expenseStore.uploadProgress + '%' }"></div>
      </div>

      <p v-if="expenseStore.uploadSuccessMessage" class="p-4 rounded-lg mt-4 text-green-800 bg-green-100 border border-green-300 font-bold">
        ✅ {{ expenseStore.uploadSuccessMessage }}
      </p>
      <p v-if="expenseStore.uploadError" class="p-4 rounded-lg mt-4 text-red-800 bg-red-100 border border-red-300 font-bold">
        ❌ {{ expenseStore.uploadError }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useExpenseStore } from '../stores/expenseStore';

const authStore = useAuthStore();
const expenseStore = useExpenseStore();

const selectedFile = ref<File | null>(null);
const previewImage = ref<string | null>(null);

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    selectedFile.value = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    expenseStore.uploadError = null;
    expenseStore.uploadSuccessMessage = null;
  } else {
    selectedFile.value = null;
    previewImage.value = null;
  }
};

const uploadSelectedFile = async () => {
  if (selectedFile.value && authStore.isLoggedIn) {
    await expenseStore.uploadReceipt(selectedFile.value);

    selectedFile.value = null;
    previewImage.value = null;
    const fileInput = document.getElementById('receipt-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  } else if (!authStore.isLoggedIn) {
    expenseStore.uploadError = '로그인해야 파일을 업로드할 수 있습니다.';
  } else {
    expenseStore.uploadError = '업로드할 파일을 선택해주세요.';
  }
};
</script>
