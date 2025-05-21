import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai/build/src/v1'; // 타입 때문에 명시적 임포트
import { ExpenseToSave } from './types';

// Firebase Admin SDK 초기화 (index.ts에서만 함)
// const db = admin.firestore(); // 여기서 초기화하지 않음. index.ts에서 admin.firestore()를 전달받거나, admin.initializeApp()이 index.ts에서 단 한번만 실행되어야 함.

const documentAiClient = new DocumentProcessorServiceClient();

const projectId = process.env.GCLOUD_PROJECT;
const location = 'us';
const processorId = 'd14c5449ea493476';

export const processReceiptImage = functions.storage.object().onFinalize(async (object) => {
    // 필요한 서비스 객체들은 admin.app()을 통해 얻거나, index.ts에서 초기화된 것을 전달받아야 함.
    // 여기서는 admin.firestore()를 직접 호출하는 대신 admin.app().firestore()를 사용하거나,
    // 최상위에서 초기화된 admin.firestore()를 사용한다고 가정.
    const db = admin.firestore();
    const auth = admin.auth();

    if (!object.name || !object.bucket) {
        console.log('No object name or bucket specified.');
        return null;
    }
    if (!object.contentType || !object.contentType.startsWith('image/')) {
        console.log('This is not an image. Skipping.');
        return null;
    }

    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name;     // File path in the bucket.

    // 이미 처리 중이거나, 이미 처리된 파일을 재처리하지 않도록 방지
    // (이 로직은 Firestore에 'processing' 상태가 있는 경우에 유효)
    // 여기서는 단순히 새롭게 추가된 파일만 처리하도록 하겠습니다.

    console.log(`Processing image: gs://${fileBucket}/${filePath}`);

    // 사용자 UID 추출 (경로에서 추출)
    const pathSegments = filePath.split('/');
    if (pathSegments.length < 2 || pathSegments[0] !== 'receipts') {
        console.error('File not in expected receipts/userId format.');
        return null;
    }
    const userId = pathSegments[1];

    let uploaderEmail: string | undefined;
    try {
        const userRecord = await auth.getUser(userId);
        uploaderEmail = userRecord.email;
        console.log(`Uploader email fetched: ${uploaderEmail}`);
    } catch (error) {
        console.error(`Error fetching user data for ${userId}:`, error);
        uploaderEmail = undefined; // 이메일을 가져오지 못하면 undefined
    }

    let fullText = '영수증에서 텍스트를 찾을 수 없습니다.';
    let extractedAmount: number | null = null;
    let extractedDate: admin.firestore.Timestamp | null = null;
    let extractedMerchant: string = '알 수 없음';
    let extractedCategory: string = '미분류';

    try {
        const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
        const file = admin.storage().bucket(fileBucket).file(filePath);
        const [fileContents] = await file.download();

        const request = {
            name,
            rawDocument: {
                content: fileContents.toString('base64'),
                mimeType: object.contentType,
            },
        };

        console.log(`Sending image to Document AI processor: ${processorId}`);
        const [result] = await documentAiClient.processDocument(request);
        const document = result.document;

        if (document && document.text) {
            fullText = document.text;
            console.log('Document AI Raw Text:', fullText);

            if (document.entities && document.entities.length > 0) {
                document.entities.forEach((entity: any) => {
                    console.log(`  Entity: ${entity.type}, Value: ${entity.mentionText}`);
                    switch (entity.type) {
                        case 'total_amount':
                            try {
                                extractedAmount = parseFloat(entity.mentionText.replace(/[^\d.]/g, ''));
                                if (isNaN(extractedAmount)) extractedAmount = null;
                            } catch (e) {
                                console.warn('Failed to parse total_amount:', entity.mentionText, e);
                            }
                            break;
                        case 'purchase_date':
                        case 'receipt_date':
                            try {
                                extractedDate = admin.firestore.Timestamp.fromDate(new Date(entity.mentionText));
                            } catch (e) {
                                console.warn('Failed to parse date:', entity.mentionText, e);
                            }
                            break;
                        case 'merchant_name':
                            extractedMerchant = entity.mentionText || '알 수 없음';
                            break;
                        case 'category':
                            extractedCategory = entity.mentionText || '미분류';
                            break;
                    }
                });
            } else {
                console.log('No entities extracted by Document AI.');
            }
        } else {
            console.log('No text or document found from Document AI.');
        }

    } catch (error) {
        console.error('Error during Document AI processing:', error);
        fullText = '영수증 처리 중 오류가 발생했습니다.';
    }

    // 파일의 public URL 가져오기
    // getDownloadURL은 file.publicUrl()과 다른 Firebase Storage SDK 방식
    // 이전에 publicUrl()이 잘 작동했으니 그대로 사용
    const originalImageUrl = `https://storage.googleapis.com/${fileBucket}/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`;


    const expenseData: ExpenseToSave = {
        userId: userId,
        uploaderEmail: uploaderEmail,
        amount: extractedAmount !== null ? extractedAmount : 0,
        date: extractedDate || admin.firestore.FieldValue.serverTimestamp(),
        merchant: extractedMerchant,
        category: extractedCategory,
        description: fullText.substring(0, Math.min(fullText.length, 500)),
        originalImageUrl: originalImageUrl, // Storage URL
        isProcessed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
        await db.collection('expenses').add(expenseData);
        console.log('Expense data saved to Firestore successfully.');
    } catch (error) {
        console.error('Error saving expense data to Firestore:', error);
    }

    return null;
});
