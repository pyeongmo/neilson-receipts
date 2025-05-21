<template>
  <div class="receipt-uploader-container">
    <h2>영수증 업로드</h2>

    <div v-if="!authStore.isLoggedIn && !authStore.loading" class="alert-message">
      <p>⚠️ 영수증을 업로드하려면 먼저 로그인해야 합니다.</p>
      <button @click="authStore.loginWithGoogle()" :disabled="authStore.loading">Google 로그인</button>
    </div>
    <div v-else-if="authStore.loading" class="loading-state">
      <p>사용자 인증 상태 확인 중...</p>
    </div>

    <div v-else class="upload-section">
      <label for="receipt-input" class="upload-button">
        <input
            type="file"
            id="receipt-input"
            accept="image/*"
            @change="handleFileChange"
            :disabled="expenseStore.uploading"
        />
        <span>
          <i class="fas fa-camera"></i> 사진 촬영 또는 파일 선택
        </span>
      </label>

      <div v-if="previewImage" class="image-preview-container">
        <h3>미리보기:</h3>
        <img :src="previewImage" alt="영수증 미리보기" class="image-preview" />
      </div>

      <button
          @click="uploadSelectedFile"
          :disabled="!selectedFile || expenseStore.uploading"
          class="submit-button"
      >
        <span v-if="!expenseStore.uploading">업로드</span>
        <span v-else>업로드 중 ({{ Math.floor(expenseStore.uploadProgress) }}%)</span>
      </button>

      <div v-if="expenseStore.uploading" class="progress-bar-container">
        <div class="progress-bar" :style="{ width: expenseStore.uploadProgress + '%' }"></div>
      </div>

      <p v-if="expenseStore.uploadSuccessMessage" class="success-message">
        ✅ {{ expenseStore.uploadSuccessMessage }}
      </p>
      <p v-if="expenseStore.uploadError" class="error-message">
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

    // 이미지 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // 이전 업로드 메시지 초기화
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
      fileInput.value = ''; // input file 초기화
    }
  } else if (!authStore.isLoggedIn) {
    expenseStore.uploadError = '로그인해야 파일을 업로드할 수 있습니다.';
  } else {
    expenseStore.uploadError = '업로드할 파일을 선택해주세요.';
  }
};
</script>

<style scoped>
.receipt-uploader-container {
  max-width: 500px;
  margin: 40px auto;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
}

h2 {
  color: #333;
  margin-bottom: 25px;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 15px 25px;
  background-color: #42b983; /* Vue green */
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: bold;
  transition: background-color 0.3s ease;
  width: 100%;
  box-sizing: border-box;
}

.upload-button:hover {
  background-color: #368a67;
}

.upload-button input[type="file"] {
  display: none; /* 실제 파일 입력 필드는 숨김 */
}

.upload-button i {
  margin-right: 10px;
  font-size: 1.2em;
}

.image-preview-container {
  margin-top: 20px;
  border: 1px solid #eee;
  padding: 15px;
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
}

.image-preview {
  max-width: 100%;
  height: auto;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.submit-button {
  padding: 12px 25px;
  background-color: #007bff; /* Blue for action */
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: bold;
  transition: background-color 0.3s ease;
  width: 100%;
  box-sizing: border-box;
}

.submit-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.progress-bar-container {
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 5px;
  height: 10px;
  overflow: hidden;
  margin-top: 10px;
}

.progress-bar {
  height: 100%;
  background-color: #42b983;
  width: 0%;
  border-radius: 5px;
  transition: width 0.3s ease-in-out;
}

.success-message {
  color: #28a745; /* Green */
  font-weight: bold;
  margin-top: 15px;
}

.error-message {
  color: #dc3545; /* Red */
  font-weight: bold;
  margin-top: 15px;
}

.alert-message {
  padding: 20px;
  background-color: #ffc10720; /* Yellow light */
  border: 1px solid #ffc107;
  border-radius: 8px;
  margin-bottom: 20px;
}

.loading-state {
  padding: 20px;
  font-style: italic;
  color: #666;
}
</style>
