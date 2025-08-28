import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai/build/src/v1';
import { ExpenseToSave } from './types';
import * as sharp from 'sharp';

const documentAiClient = new DocumentProcessorServiceClient();

const projectId = process.env.GCLOUD_PROJECT;
const location = 'us';
const processorId = 'd14c5449ea493476';

export const processReceiptImage = functions.storage.object().onFinalize(async (object) => {
  const db = admin.firestore();
  const auth = admin.auth();
  const storage = admin.storage();

  if (!object.name || !object.bucket) {
    console.log('No object name or bucket specified.');
    return null;
  }
  if (!object.contentType || !object.contentType.startsWith('image/')) {
    console.log('This is not an image. Skipping.');
    return null;
  }

  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.

  // 썸네일 생성을 피하기 위해 처리 중인 파일 스킵
  if (filePath.includes('thumbnails/')) {
    console.log('Thumbnail already created. Skipping.');
    return null;
  }
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
  let extractedMerchant = '알 수 없음';
  let extractedCategory = '미분류';
  let thumbnailUrl: string | null = null;

  try {
    const file = storage.bucket(fileBucket).file(filePath);
    const [fileContents] = await file.download();
    const mimeType = object.contentType;

    // --- 썸네일 생성 및 업로드 로직 추가 시작 ---
    const thumbnailName = `receipts/${userId}/thumbnails/${pathSegments.slice(2).join('/')}_150x150.webp`;
    const thumbnailFile = storage.bucket(fileBucket).file(thumbnailName);
    const thumbnailStream = thumbnailFile.createWriteStream({
      metadata: { contentType: 'image/webp' },
    });

    // sharp를 사용하여 이미지 크기를 150px로 조절하고 WebP 포맷으로 변환
    const pipeline = sharp(fileContents)
      .resize(150, 150, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .webp({ quality: 80 });

    await pipeline.pipe(thumbnailStream).on('finish', () => console.log('Thumbnail generated and uploaded.'));
    thumbnailUrl = `https://storage.googleapis.com/${fileBucket}/${encodeURIComponent(thumbnailName).replace(/%2F/g, '/')}`;
    // --- 썸네일 생성 및 업로드 로직 추가 종료 ---

    // Document AI 처리 로직 (기존 코드와 동일)
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    const request = {
      name,
      rawDocument: {
        content: fileContents.toString('base64'),
        mimeType: mimeType,
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
    console.error('Error during Document AI or thumbnail processing:', error);
    fullText = '영수증 처리 중 오류가 발생했습니다.';
  }

  const originalImageUrl = `https://storage.googleapis.com/${fileBucket}/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`;


  const expenseData: ExpenseToSave = {
    userId: userId,
    uploaderEmail: uploaderEmail,
    amount: extractedAmount !== null ? extractedAmount : 0,
    date: extractedDate || admin.firestore.FieldValue.serverTimestamp(),
    merchant: extractedMerchant,
    category: extractedCategory,
    description: fullText.substring(0, Math.min(fullText.length, 500)),
    originalImageUrl: originalImageUrl,
    thumbnailUrl: thumbnailUrl || '',
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
