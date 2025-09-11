# 📋 Neilson Receipts

법인 카드 영수증 관리 웹 애플리케이션

## 🎯 개요

**Neilson Receipts**는 법인 카드 영수증을 효율적으로 관리할 수 있는 웹 애플리케이션입니다.
Firebase 기반으로 구축되어 실시간 데이터 동기화와 안전한 인증을 제공합니다.

## ✨ 주요 기능

- **Google 계정 로그인**: 간편한 인증 시스템
- **영수증 업로드**: 영수증 이미지 및 정보 저장
- **비용 관리**: 지출 내역 추가, 수정, 삭제
- **처리 상태 관리**: 미처리/완료 상태 토글
- **요약 보고서**: 미처리 현황 조회
- **실시간 동기화**: Firebase를 통한 실시간 데이터 업데이트

## 🛠️ 기술 스택

### Frontend
- **Vue.js 3.5.13**: 현대적인 프론트엔드 프레임워크
- **TypeScript 5.8.3**: 타입 안정성 강화
- **Pinia 3.0.2**: 상태 관리 라이브러리
- **Tailwind CSS 4.1.7**: 유틸리티 우선 CSS 프레임워크
- **Vite 6.3.5**: 빠른 개발 서버 및 빌드 도구

### Backend & Infrastructure
- **Firebase 11.8.0**: 백엔드 서비스 (Authentication, Firestore, Functions, Hosting, Storage)
- **Firebase Functions**: 서버리스 백엔드 로직
- **Firestore**: NoSQL 데이터베이스
- **Firebase Storage**: 파일 저장소

### 개발 도구
- **ESLint**: 코드 품질 관리
- **vue-tsc**: TypeScript 컴파일러
- **pnpm**: 패키지 관리자

## 📁 프로젝트 구조

```
neilson-receipts/
 ├── src/
 │ ├── components/ # Vue 컴포넌트 
 │ │ ├── ExpenseItem.vue # 개별 지출 항목 컴포넌트 
 │ │ ├── ExpenseList.vue # 지출 목록 컴포넌트 
 │ │ ├── ReceiptUploader.vue # 영수증 업로드 컴포넌트 
 │ │ └── SummaryModal.vue # 요약 모달 컴포넌트 
 │ ├── stores/ # Pinia 상태 관리 
 │ │ ├── authStore.ts # 인증 관련 상태 
 │ │ └── expenseStore.ts # 지출 관련 상태 
 │ ├── types/ # TypeScript 타입 정의 
 │ │ ├── Expense.ts # 지출 데이터 타입 
 │ │ └── User.ts # 사용자 프로필 타입 
 │ ├── App.vue # 메인 애플리케이션 컴포넌트 
 │ ├── firebaseConfig.ts # Firebase 설정 
 │ └── main.ts # 애플리케이션 진입점 
 ├── functions/ # Firebase Functions 
 ├── public/ # 정적 파일 
 ├── dist/ # 빌드 결과물 
 └── firebase.json # Firebase 설정
```

## 🚀 시작하기

### 사전 요구사항
- Node.js 16.x 이상
- pnpm 패키지 매니저
- Firebase 계정 및 프로젝트

### 설치

1. **의존성 설치**
    ```bash
    pnpm install
    ```
2. **Firebase 설정**
    - Firebase CLI 설치: `npm i -g firebase-tools`
    - 로그인: `firebase login`
    - `src/firebaseConfig.ts`에 Firebase 설정 정보 입력
    - Gemini API 키 등록: `firebase functions:config:set googleai.apikey="YOUR_GOOGLEAI_API_KEY"`
    - Firestore, Authentication, Storage 활성화
3. **개발 서버 실행**
    ```bash
    pnpm run serve
    ```

### 빌드 및 배포
1. **프로덕션 빌드**
    ```bash
    pnpm run build
    ```
2. **Firebase 배포**
    ```bash
    pnpm run deploy
    ```

## 🔧 주요 설정

### Firebase 서비스
- **Authentication**: Google 로그인 공급자
- **Firestore**: 문서 기반 NoSQL 데이터베이스
- **Storage**: 영수증 이미지 파일 저장
- **Functions**: 서버사이드 로직 처리
- **Hosting**: 정적 웹사이트 호스팅

### 패키지 관리자
프로젝트는 `pnpm` 패키지 매니저를 사용합니다. (`packageManager: "pnpm@10.10.0"`)

## 🔐 보안

- Google OAuth 2.0 인증
- Firebase Security Rules를 통한 데이터 접근 제어
- 사용자별 데이터 격리
