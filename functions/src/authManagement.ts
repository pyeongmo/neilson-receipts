import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// 허용된 이메일 도메인
const ALLOWED_EMAIL_DOMAIN = '@neilson.co.kr';

/**
 * 새 사용자가 생성될 때 이메일 도메인을 확인하여 허용되지 않는 경우 계정을 비활성화합니다.
 */
export const enforceEmailDomain = functions.auth.user().onCreate(async (user) => {
    // 사용자의 이메일이 없거나, 이메일이 허용된 도메인으로 끝나지 않는 경우
    if (!user.email || !user.email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
        console.warn(`Attempted sign-up with unauthorized email domain: ${user.email}. User ID: ${user.uid}`);

        try {
            // 사용자 계정을 비활성화하여 추가적인 로그인을 막습니다.
            await admin.auth().updateUser(user.uid, { disabled: true });
            console.log(`User ${user.uid} (${user.email}) disabled due to unauthorized domain.`);

        } catch (error) {
            console.error(`Error disabling/deleting user ${user.uid}:`, error);
        }
    } else {
        console.log(`User ${user.uid} (${user.email}) created with allowed domain.`);
    }
    return null;
});
