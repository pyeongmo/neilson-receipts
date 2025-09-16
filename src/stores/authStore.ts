// src/stores/authStore.ts
import { defineStore } from 'pinia';
import { auth, googleProvider } from '../firebaseConfig'; // Firebase 설정 파일 임포트
import { type User, onAuthStateChanged, signInWithPopup, type UserCredential, GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth'; // Firebase Auth 타입 임포트

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as User | null, // Firebase User 객체를 저장 (로그아웃 시 null)
        isLoggedIn: false,
        loading: true, // 초기 로딩 상태 (Firebase Auth 상태 확인 중)
        error: null as string | null, // 로그인/로그아웃 관련 에러 메시지
        oneTapReady: false, // One Tap 초기화 상태
    }),

    getters: {
        currentUserUid: (state): string | null => state.user?.uid || null, // 현재 로그인한 사용자 UID
        currentUserEmail: (state): string | null => state.user?.email || null, // 현재 로그인한 사용자 Email
    },

    actions: {
        // Firebase Auth 상태 변화를 감지하고 user 상태를 업데이트하는 초기화 액션
        // 앱이 시작될 때 한 번 호출되어야 합니다.
        initializeAuthListener() {
            this.loading = true;
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // **리스너 내부에서도 도메인 검증 추가**
                    // 새로고침 시에도 적용되도록
                    if (user.email && !user.email.endsWith('@neilson.co.kr')) {
                        console.warn('Unauthorized email domain on auth state change:', user.email);
                        this.error = '로그인된 계정이 @neilson.co.kr 도메인이 아닙니다. 로그아웃됩니다.';
                        alert('@neilson.co.kr 도메인 이메일로만 로그인할 수 있습니다.');
                        await this.logout(); // 즉시 로그아웃
                        return;
                    }

                    this.user = user;
                    this.isLoggedIn = true;
                    console.log('Auth state changed: User is logged in.', user.email);

                  // 로그인된 상태에서는 One Tap 프롬프트/자동선택을 취소/억제
                  try {
                    const g = (window as any)?.google;
                    g?.accounts?.id?.cancel?.();
                    g?.accounts?.id?.disableAutoSelect?.();
                  } catch (e) {
                    // no-op
                  }
                } else {
                    this.user = null;
                    this.isLoggedIn = false;
                    console.log('Auth state changed: User is logged out.');
                }
                this.loading = false;

              // 비로그인 상태 확정되면 One Tap 프롬프트 시도
              if (!this.isLoggedIn) {
                this.tryPromptGoogleOneTap();
              }
            });
        },

        // Google 로그인 액션 (팝업)
        async loginWithGoogle(): Promise<boolean> {
            this.loading = true;
            this.error = null;
            try {
                const result: UserCredential = await signInWithPopup(auth, googleProvider);
                if (result.user.email && !result.user.email.endsWith('@neilson.co.kr')) {
                    console.warn('Unauthorized email domain:', result.user.email);
                    this.error = '@neilson.co.kr 도메인 이메일로만 로그인할 수 있습니다.';
                    alert('@neilson.co.kr 도메인 이메일로만 로그인할 수 있습니다.');
                    await this.logout(); // 허용되지 않는 사용자 즉시 로그아웃
                    return false; // 로그인 프로세스 중단
                }

                this.user = result.user; // Pinia 상태 업데이트

                return true;
            } catch (error: any) {
                console.error('Google 로그인 실패:', error.message);
                this.error = error.message || 'Google 로그인에 실패했습니다.';
                this.loading = false;
                return false;
            } finally {
                // 로그인 성공 후에는 로딩 상태를 false로 설정해야 하지만,
                // onAuthStateChanged 리스너가 최종적으로 user를 업데이트하므로 여기서 꼭 필요하지 않을 수 있음.
                // 즉각적인 UI 피드백을 위해 남겨둠.
                if (!this.user) { // 로그인에 실패한 경우에만 loading을 false로 설정
                    this.loading = false;
                }
            }
        },

      // One Tap 초기화
      initializeGoogleOneTap() {
        if (typeof window === 'undefined') return;
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
        if (!clientId) {
          console.warn('[OneTap] VITE_GOOGLE_CLIENT_ID가 설정되어 있지 않습니다.');
          return;
        }

        const doInit = () => {
          const g = (window as any).google;
          if (!g?.accounts?.id) {
            console.warn('[OneTap] google.accounts.id가 로드되지 않았습니다.');
            return;
          }

          if (!(window as any).__oneTapInitialized__) {
            g.accounts.id.initialize({
              client_id: clientId,
              callback: async (response: any) => {
                const idToken = response?.credential;
                if (!idToken) return;
                await this.loginWithOneTapCredential(idToken);
              },
              cancel_on_tap_outside: true,
              context: 'signin',
              itp_support: true,
              use_fedcm_for_prompt: true,
            });
            (window as any).__oneTapInitialized__ = true;
            this.oneTapReady = true;
            console.info('[OneTap] Initialized');
          }

          // 초기화와 별개로, 조건이 맞으면 프롬프트 호출
          this.tryPromptGoogleOneTap();
        };

        if ((window as any).google?.accounts?.id) {
          doInit();
        } else {
          window.addEventListener(
            'load',
            () => {
              doInit();
            },
            { once: true }
          );
        }
      },

      // 현재 상태에서 프롬프트를 띄울 수 있으면 띄움
      tryPromptGoogleOneTap() {
        if (typeof window === 'undefined') return;
        if (this.loading || this.isLoggedIn) return; // 비로그인 + loading=false일 때만
        const g = (window as any)?.google;
        if (!g?.accounts?.id) return;

        // 이전에 억제했더라도 prompt는 동작함
        g.accounts.id.prompt();
      },

      // One Tap credential로 Firebase 로그인
      async loginWithOneTapCredential(idToken: string): Promise<boolean> {
        this.loading = true;
        this.error = null;
        try {
          const credential = GoogleAuthProvider.credential(idToken);
          const result = await signInWithCredential(auth, credential);

          // 도메인 제한 체크
          if (result.user.email && !result.user.email.endsWith('@neilson.co.kr')) {
            console.warn('Unauthorized email domain (One Tap):', result.user.email);
            this.error = '@neilson.co.kr 도메인 이메일로만 로그인할 수 있습니다.';
            await this.logout();
            return false;
          }

          this.user = result.user;
          return true;
        } catch (error: any) {
          console.error('One Tap 로그인 실패:', error?.message || error);
          // 사용자가 닫았거나, 계정없음 등은 조용히 처리 가능
          this.error = error?.message || 'One Tap 로그인에 실패했습니다.';
          return false;
        } finally {
          if (!this.user) {
            this.loading = false;
          }
        }
      },

        // 로그아웃 액션
        async logout(): Promise<void> {
            this.loading = true;
            this.error = null;
            try {
                await signOut(auth);
                this.user = null; // Pinia 상태 업데이트
                console.log('로그아웃 성공');
            } catch (error: any) {
                console.error('로그아웃 실패:', error.message);
                this.error = error.message || '로그아웃에 실패했습니다.';
            } finally {
                this.loading = false;
            }
        },
    },
});
