import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export interface ServerEmailLog {
  id: string;
  recipient: string;
  subject: string;
  template: string;
  status: 'sent' | 'failed' | 'queued';
  error_message?: string;
  created_at: string;
}

// Recent email dispatch results (diagnostics only; persistent log is the email_logs table)
export const serverEmailLogs: ServerEmailLog[] = [];
export const uploadedAssetsMap = new Map<string, { buffer: Buffer; contentType: string }>();

/**
 * Server-side PDF Text Extraction & Scanned Document Detection
 */
export async function extractTextFromPdfBuffer(
  pdfBuffer: Buffer,
  maxPages = 25
): Promise<{ text: string; numPages: number; isScanned: boolean }> {
  // @ts-ignore
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8 = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const pagesToRead = Math.min(numPages, maxPages);
  let aggregatedText = '';

  for (let i = 1; i <= pagesToRead; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageStr = content.items
        .map((it: any) => it.str)
        .filter(Boolean)
        .join(' ');
      aggregatedText += `\n--- Page ${i} ---\n` + pageStr;
    } catch (pageErr) {
      console.warn(`[PDF Extraction] Error reading page ${i}:`, pageErr);
    }
  }

  // Detect scanned or image-only or unreadable PDFs
  const cleaned = aggregatedText.replace(/--- Page \d+ ---/g, '').trim();
  const alphanumericChars = (cleaned.match(/[a-zA-Z0-9]/g) || []).length;
  const isScanned = cleaned.length < 50 || alphanumericChars < 30;

  return { text: aggregatedText, numPages, isScanned };
}

/**
 * AI Quiz Generation using Gemini API (@google/genai) with Resilient Fallback
 */
export async function generateQuizQuestionsFromText(
  text: string,
  count = 5,
  topic = ''
): Promise<Array<{
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
}>> {
  const prompt = `You are a senior insurance educator and curriculum designer for KBZLife Insurance.
Create exactly ${count} professional, clear multiple-choice quiz questions based strictly on the following study material.
${topic ? `Topic Focus: ${topic}` : ''}

MATERIAL:
"""
${text.slice(0, 16000)}
"""

RULES:
1. Each question must evaluate an essential concept or regulatory rule from the text.
2. Provide exactly 4 distinct options per question.
3. Mark the zero-based index of the correct answer (0, 1, 2, or 3).
4. Provide a helpful, clear explanation for why the answer is correct quoting or referencing the material.
5. Return JSON ONLY with this exact schema:
[
  {
    "question_text": "Question statement?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "Why Option A is correct according to the material."
  }
]`;

  let parsed: any = null;
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

  if (apiKey && apiKey.length > 5) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const callModel = async (modelName: string) => {
        const result = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API call timed out after 8s')), 8000)
          ),
        ]);
        return result.text || '';
      };

      let responseText = '';
      try {
        responseText = await callModel('gemini-3.8-flash');
      } catch (primaryErr) {
        console.warn('[Gemini Quiz] Primary model failed, trying gemini-3.1-flash-lite fallback:', primaryErr);
        try {
          responseText = await callModel('gemini-3.1-flash-lite');
        } catch (fallbackErr) {
          console.warn('[Gemini Quiz] Fallback model failed:', fallbackErr);
        }
      }

      if (responseText && responseText.trim()) {
        const cleanJson = responseText.trim().replace(/^```json/i, '').replace(/```$/, '').trim();
        parsed = JSON.parse(cleanJson);
      }
    } catch (aiErr) {
      console.warn('[Gemini Quiz Generation] AI model unavailable or error, using document-grounded text extraction fallback:', aiErr);
    }
  }

  // Fallback heuristic: Extract key sentences and build multiple choice questions
  if (!Array.isArray(parsed) || parsed.length === 0) {
    const rawParagraphs = text
      .split(/\n\n+|(?<=[.!?])\s+---|\n(?=[A-Z0-9.\-•])/)
      .map((p) => p.replace(/--- Page \d+ ---/g, '').trim())
      .filter((p) => p.length >= 40 && p.length <= 400 && !p.startsWith('http'));

    const sentences = rawParagraphs.length >= count ? rawParagraphs : text.split(/(?<=[.!?])\s+/).filter((s) => s.length >= 35 && s.length <= 250);

    const generatedFallback: any[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < Math.min(count, Math.max(3, sentences.length)); i++) {
      let chosenIdx = Math.floor(Math.random() * sentences.length);
      let attempts = 0;
      while (usedIndices.has(chosenIdx) && attempts < 20) {
        chosenIdx = (chosenIdx + 1) % sentences.length;
        attempts++;
      }
      usedIndices.add(chosenIdx);

      const sentence = sentences[chosenIdx] || `Standard compliance rule ${i + 1} governs insurance advisory.`;
      const cleanSentence = sentence.replace(/[\n\r]+/g, ' ').trim();

      const questionTypes = [
        `According to the curriculum for "${topic || 'Insurance Standards'}", which statement accurately reflects the policy?`,
        `Based on the official study handbook, what is the primary compliance requirement?`,
        `Regarding "${topic || 'KBZLife Operational Guidelines'}", which of the following is correct?`,
        `Under statutory regulatory guidance, how should the following requirement be applied?`,
      ];

      const qText = questionTypes[i % questionTypes.length];
      const correctOption = cleanSentence;

      const distractors = [
        `It is discretionary and only applies during optional administrative reviews.`,
        `Requirements may be waived without supervisory notification or documentation.`,
        `Documentation is optional unless expressly requested by external parties.`,
        `Applicable only to third-party contractors and not to permanent advisory personnel.`,
      ];

      // Shuffle options and pick random correct index
      const targetCorrectIdx = Math.floor(Math.random() * 4);
      const options = [...distractors.slice(0, 3)];
      options.splice(targetCorrectIdx, 0, correctOption);

      generatedFallback.push({
        question_text: qText,
        options,
        correct_option_index: targetCorrectIdx,
        explanation: `As stated directly in the document: "${cleanSentence}"`,
      });
    }

    parsed = generatedFallback;
  }

  return parsed.map((item: any, idx: number) => {
    let opts = Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()) : [];
    while (opts.length < 4) {
      opts.push(`Alternative ${String.fromCharCode(65 + opts.length)}`);
    }
    if (opts.length > 4) opts = opts.slice(0, 4);

    let correctIdx = Number(item.correct_option_index);
    if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= opts.length) {
      correctIdx = 0;
    }

    return {
      question_text: String(item.question_text || `Question ${idx + 1}`),
      options: opts,
      correct_option_index: correctIdx,
      explanation: String(item.explanation || 'Refer to the curriculum document for guidance.'),
    };
  });
}

// Helper: Check if real email delivery provider is configured
export function isEmailConfigured(): boolean {
  return Boolean(
    (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 5) ||
    (process.env.SMTP_HOST && process.env.SMTP_HOST.trim().length > 3)
  );
}

// Helper: Send Real Email via Resend HTTP API or Nodemailer SMTP Transport
export async function sendRealEmail(
  to: string,
  subject: string,
  html: string,
  templateName: string
): Promise<{ success: boolean; message: string; details?: unknown }> {
  const from = process.env.EMAIL_FROM || 'KBZLife LMS <noreply@kbzlife.com>';
  const logId = 'email_' + Date.now();

  // Option 1: Resend HTTP API
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Resend API error');
      }

      serverEmailLogs.unshift({
        id: logId,
        recipient: to,
        subject,
        template: templateName,
        status: 'sent',
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Email successfully accepted by Resend delivery provider.',
        details: data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      serverEmailLogs.unshift({
        id: logId,
        recipient: to,
        subject,
        template: templateName,
        status: 'failed',
        error_message: msg,
        created_at: new Date().toISOString(),
      });
      return { success: false, message: `Email delivery failed via Resend: ${msg}` };
    }
  }

  // Option 2: SMTP Transport via Nodemailer
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || '',
        },
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      serverEmailLogs.unshift({
        id: logId,
        recipient: to,
        subject,
        template: templateName,
        status: 'sent',
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Email sent successfully via SMTP server.',
        details: info,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      serverEmailLogs.unshift({
        id: logId,
        recipient: to,
        subject,
        template: templateName,
        status: 'failed',
        error_message: msg,
        created_at: new Date().toISOString(),
      });
      return { success: false, message: `SMTP transmission failed: ${msg}` };
    }
  }

  // Option 3: Provider not configured in env
  const unconfiguredNotice =
    'Real email delivery requires RESEND_API_KEY or SMTP_HOST in .env. Dispatch was recorded in LMS audit log.';
  serverEmailLogs.unshift({
    id: logId,
    recipient: to,
    subject,
    template: templateName,
    status: 'queued',
    error_message: 'Email provider credentials not configured in environment',
    created_at: new Date().toISOString(),
  });

  return {
    success: false,
    message: unconfiguredNotice,
    details: { recipient: to, template: templateName },
  };
}

// Helper to parse JSON body from request stream
function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    if ((req as any).body && typeof (req as any).body === 'object') {
      return resolve((req as any).body);
    }
    if (req.complete || (req as any).readableEnded) {
      return resolve({});
    }
    let body = '';
    const onData = (chunk: Buffer | string) => {
      body += chunk;
    };
    const onEnd = () => {
      cleanup();
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    };
    const onError = () => {
      cleanup();
      resolve({});
    };
    const cleanup = () => {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
    };
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.resume();
  });
}

// Helper to send JSON response
function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// ---------------------------------------------------------------------
// Supabase helpers for server routes
// ---------------------------------------------------------------------
function supabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const configured = Boolean(url && anonKey && !url.includes('your-project'));
  return { url, anonKey, serviceKey, configured };
}

/** Service-role client (bypasses RLS). Only for trusted server-side work. */
function getServiceClient() {
  const env = supabaseEnv();
  if (!env.configured || !env.serviceKey) return null;
  return createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

interface RequestProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  account_status: string;
}

/** Resolves the signed-in user from the "Authorization: Bearer <access token>" header. */
async function getRequestProfile(req: IncomingMessage): Promise<RequestProfile | null> {
  const env = supabaseEnv();
  if (!env.configured) return null;
  const header = String(req.headers['authorization'] || '');
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const userClient = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: profile } = await userClient
    .from('profiles')
    .select('id, email, full_name, role, account_status')
    .eq('id', userData.user.id)
    .maybeSingle();
  return (profile as RequestProfile) || null;
}

/** Sends 401/403 and returns null unless the caller is an active administrator. */
async function requireAdminRequest(req: IncomingMessage, res: ServerResponse): Promise<RequestProfile | null> {
  const profile = await getRequestProfile(req);
  if (!profile) {
    sendJson(res, 401, { success: false, message: 'Sign in required.' });
    return null;
  }
  if (profile.role !== 'admin' || !['active', 'approved'].includes(profile.account_status)) {
    sendJson(res, 403, { success: false, message: 'Administrator access required.' });
    return null;
  }
  return profile;
}

/** Persists the most recent email dispatch result to the email_logs table (if a service key is set). */
async function persistLatestEmailLog(): Promise<ServerEmailLog | null> {
  const latest = serverEmailLogs[0];
  if (!latest) return null;
  const service = getServiceClient();
  if (!service) return latest;
  const { id: _localId, ...row } = latest;
  const { data, error } = await service.from('email_logs').insert(row).select().single();
  if (error) {
    console.warn('[KBZLife LMS] Could not persist email log:', error.message);
    return latest;
  }
  return data as ServerEmailLog;
}

// Universal API Middleware compatible with Connect / Express / Vite
export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): Promise<void> {
  const url = req.url?.split('?')[0] || '';
  const method = req.method?.toUpperCase() || 'GET';

  // Only handle routes starting with /api
  if (!url.startsWith('/api')) {
    return next();
  }

  try {
    // 1. GET /api/health
    if (url === '/api/health' && method === 'GET') {
      const env = supabaseEnv();
      return sendJson(res, 200, {
        status: 'ok',
        time: new Date().toISOString(),
        supabaseLive: env.configured,
        serviceRoleConfigured: Boolean(env.serviceKey),
        emailConfigured: isEmailConfigured(),
      });
    }

    // POST /api/admin/users/invite — create a Supabase Auth user and send the invitation email
    if (url === '/api/admin/users/invite' && method === 'POST') {
      const admin = await requireAdminRequest(req, res);
      if (!admin) return;

      const service = getServiceClient();
      if (!service) {
        return sendJson(res, 501, {
          success: false,
          message: 'Inviting users requires SUPABASE_SECRET_KEY (service role key) in the server environment.',
        });
      }

      const body = await parseJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const fullName = String(body.full_name || '').trim();
      const role = body.role === 'admin' ? 'admin' : 'user';
      const department = String(body.department || '').trim() || 'General Employee';
      const employeeId = String(body.employee_id || '').trim() || null;
      const redirectTo = String(body.redirectTo || process.env.APP_URL || '') || undefined;

      if (!email || !fullName) {
        return sendJson(res, 400, { success: false, message: 'Full name and email are required.' });
      }

      const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: fullName, department, employee_id: employeeId || undefined },
      });
      if (inviteError || !invited.user) {
        return sendJson(res, 400, { success: false, message: inviteError?.message || 'Invitation failed.' });
      }

      // The auth trigger created a pending learner profile; apply the admin's choices.
      const { data: profile, error: profileError } = await service
        .from('profiles')
        .update({
          full_name: fullName,
          role,
          account_status: 'active',
          department,
          employee_id: employeeId,
          must_change_password: false,
        })
        .eq('id', invited.user.id)
        .select()
        .single();
      if (profileError) {
        return sendJson(res, 500, { success: false, message: `User invited, but profile update failed: ${profileError.message}` });
      }

      return sendJson(res, 200, { success: true, profile });
    }

    // 6. POST /api/email/send
    if (url === '/api/email/send' && method === 'POST') {
      if (!(await requireAdminRequest(req, res))) return;
      const body = await parseJsonBody(req);
      const { to, subject, html, template } = body;

      if (!to || !subject || !html) {
        return sendJson(res, 400, {
          success: false,
          message: 'Missing required email fields (to, subject, html).',
        });
      }

      const result = await sendRealEmail(to, subject, html, template || 'custom_notification');
      const log = await persistLatestEmailLog();
      return sendJson(res, 200, { ...result, log });
    }

    // 7. GET /api/email/status
    if (url === '/api/email/status' && method === 'GET') {
      if (!(await requireAdminRequest(req, res))) return;
      return sendJson(res, 200, {
        configured: isEmailConfigured(),
        provider: process.env.RESEND_API_KEY
          ? 'Resend API'
          : process.env.SMTP_HOST
          ? 'SMTP Transport'
          : 'Unconfigured (Queued on server)',
        sender: process.env.EMAIL_FROM || 'KBZLife LMS <noreply@kbzlife.com>',
        recentLogs: serverEmailLogs.slice(0, 20),
      });
    }

    // 8. POST /api/upload - Direct File & Image Upload (Supabase Storage with resilient fallback)
    if (url === '/api/upload' && method === 'POST') {
      if (!(await getRequestProfile(req))) {
        return sendJson(res, 401, { success: false, message: 'Sign in required to upload files.' });
      }
      const body = await parseJsonBody(req);
      const { fileName, fileType, dataUrl, bucket = 'company-news' } = body;

      if (!dataUrl || !fileName) {
        return sendJson(res, 400, {
          success: false,
          message: 'Missing required file payload (dataUrl, fileName).',
        });
      }

      // Extract raw base64 buffer
      const base64Data = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl;
      const buffer = Buffer.from(base64Data, 'base64');
      const contentType = fileType || 'image/jpeg';
      const cleanFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Check if Supabase Storage is live and configured
      const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

      if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(cleanFileName, buffer, {
              contentType,
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(cleanFileName);

            if (publicUrlData?.publicUrl) {
              return sendJson(res, 200, {
                success: true,
                url: publicUrlData.publicUrl,
                fileName: cleanFileName,
                bucket,
                provider: 'supabase-storage',
                message: 'Image successfully uploaded to Supabase Storage.',
              });
            }
          } else {
            console.warn('[KBZLife LMS] Supabase Storage upload error, falling back to server asset store:', uploadError.message);
          }
        } catch (supabaseErr) {
          console.warn('[KBZLife LMS] Supabase Storage request failed, using server fallback:', supabaseErr);
        }
      }

      // Resilient server-side storage fallback with disk persistence
      const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanFileName}`;
      uploadedAssetsMap.set(assetId, { buffer, contentType });

      // Save to public/uploads directory so Vite and web servers serve it statically and persistently
      try {
        const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const diskFilePath = path.join(uploadsDir, cleanFileName);
        fs.writeFileSync(diskFilePath, buffer);
      } catch (fsErr) {
        console.warn('[KBZLife LMS] Could not persist to public/uploads disk directory:', fsErr);
      }

      // Return server-accessible URL (served via /uploads/ or /api/storage/uploads/)
      const fallbackUrl = `/uploads/${encodeURIComponent(cleanFileName)}`;
      return sendJson(res, 200, {
        success: true,
        url: fallbackUrl,
        fileName: cleanFileName,
        bucket,
        provider: 'server-asset-store',
        message: 'Image uploaded and persisted successfully.',
      });
    }

    // 8B. POST /api/upload/chunk - Resumable & Chunked Upload for Large Files up to 1 GB (Videos & PDFs)
    if (url === '/api/upload/chunk' && method === 'POST') {
      if (!(await getRequestProfile(req))) {
        return sendJson(res, 401, { success: false, message: 'Sign in required to upload files.' });
      }
      const uploadId = req.headers['x-upload-id'] as string;
      const rawFileName = (req.headers['x-file-name'] as string) || 'upload.bin';
      const fileName = decodeURIComponent(rawFileName);
      const chunkIndex = parseInt((req.headers['x-chunk-index'] as string) || '0', 10);
      const totalChunks = parseInt((req.headers['x-total-chunks'] as string) || '1', 10);
      const contentType = (req.headers['x-file-type'] as string) || 'application/octet-stream';
      const bucket = (req.headers['x-bucket'] as string) || 'license-training';

      if (!uploadId) {
        return sendJson(res, 400, { success: false, message: 'Missing x-upload-id header' });
      }

      // Collect raw binary chunk without loading entire file into memory
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const chunkBuffer = Buffer.concat(chunks);

      const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const tempFilePath = path.join(uploadsDir, `temp_${uploadId}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`);

      // If chunkIndex is 0, start clean file
      if (chunkIndex === 0 && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch {}
      }

      // Append binary chunk directly to disk stream
      fs.appendFileSync(tempFilePath, chunkBuffer);

      // Check if upload is complete
      const isComplete = chunkIndex === totalChunks - 1;
      if (isComplete) {
        const finalCleanName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const finalFilePath = path.join(uploadsDir, finalCleanName);
        fs.renameSync(tempFilePath, finalFilePath);

        const stats = fs.statSync(finalFilePath);
        const publicUrl = `/uploads/${encodeURIComponent(finalCleanName)}`;

        // Also check if Supabase storage is active and try mirroring
        const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
        if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
          try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const fileStream = fs.createReadStream(finalFilePath);
            const { error: sError } = await supabase.storage.from(bucket).upload(finalCleanName, fileStream as any, {
              contentType,
              duplex: 'half',
              upsert: true,
            });
            if (!sError) {
              const { data: pUrl } = supabase.storage.from(bucket).getPublicUrl(finalCleanName);
              if (pUrl?.publicUrl) {
                return sendJson(res, 200, {
                  success: true,
                  complete: true,
                  url: pUrl.publicUrl,
                  storage_path: finalCleanName,
                  fileName: finalCleanName,
                  size: stats.size,
                  bucket,
                  provider: 'supabase-storage',
                  message: 'File assembled and stored in Supabase Storage.',
                });
              }
            }
          } catch (supErr) {
            console.warn('[KBZLife LMS] Supabase mirror notice:', supErr);
          }
        }

        return sendJson(res, 200, {
          success: true,
          complete: true,
          url: publicUrl,
          storage_path: finalCleanName,
          fileName: finalCleanName,
          size: stats.size,
          bucket,
          provider: 'server-asset-store',
          message: 'Large file assembled successfully on persistent storage.',
        });
      }

      return sendJson(res, 200, {
        success: true,
        complete: false,
        chunkIndex,
        totalChunks,
        progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
      });
    }

    // 9. GET /api/storage/uploads/:id - Serve uploaded asset buffers
    if (url.startsWith('/api/storage/uploads/') && method === 'GET') {
      const assetId = decodeURIComponent(url.replace('/api/storage/uploads/', ''));
      const asset = uploadedAssetsMap.get(assetId);

      if (asset) {
        res.statusCode = 200;
        res.setHeader('Content-Type', asset.contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Length', asset.buffer.length);
        res.end(asset.buffer);
        return;
      }

      // Check disk storage in public/uploads
      try {
        const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
        // Extract fileName from assetId if matching pattern
        const fileName = assetId.includes('_') ? assetId.split('_').slice(3).join('_') || assetId : assetId;
        const filePath = path.join(uploadsDir, fileName);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const ext = path.extname(fileName).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          res.statusCode = 200;
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Content-Length', fileBuffer.length);
          res.end(fileBuffer);
          return;
        }
      } catch {}

      return sendJson(res, 404, { success: false, message: 'Uploaded asset not found.' });
    }

    // 9B. GET /api/pdf-stream - Clean CORS & frame-friendly PDF streaming endpoint
    if (url === '/api/pdf-stream' && (method === 'GET' || method === 'HEAD')) {
      const parsedUrl = new URL(req.url || '', 'http://localhost');
      const targetUrl = parsedUrl.searchParams.get('url') || '';

      if (!targetUrl) {
        return sendJson(res, 400, { success: false, message: 'Missing pdf url parameter.' });
      }

      // Handle local uploads or public directory files
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        const decodedUrl = decodeURIComponent(targetUrl);
        const cleanPath = decodedUrl.replace(/^\//, '');
        const publicDir = path.resolve(process.cwd(), 'public');
        const candidatePath = path.resolve(publicDir, cleanPath);
        const uploadsCandidate = path.resolve(publicDir, 'uploads', path.basename(decodedUrl));

        let localPathToServe: string | null = null;
        if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
          localPathToServe = candidatePath;
        } else if (fs.existsSync(uploadsCandidate) && fs.statSync(uploadsCandidate).isFile()) {
          localPathToServe = uploadsCandidate;
        }

        if (localPathToServe) {
          const stats = fs.statSync(localPathToServe);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Length', stats.size);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          if (method === 'HEAD') {
            res.end();
            return;
          }
          const stream = fs.createReadStream(localPathToServe);
          stream.pipe(res);
          return;
        }
      }

      // If remote URL, fetch and proxy with CORS headers
      try {
        const remoteRes = await fetch(targetUrl);
        if (!remoteRes.ok) {
          return sendJson(res, remoteRes.status, { success: false, message: 'Could not fetch remote PDF.' });
        }

        const contentLength = remoteRes.headers.get('content-length');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }

        if (method === 'HEAD') {
          res.end();
          return;
        }

        if (remoteRes.body) {
          const { Readable } = await import('stream');
          // @ts-ignore
          const nodeStream = Readable.fromWeb(remoteRes.body as any);
          nodeStream.pipe(res);
          return;
        } else {
          res.end();
          return;
        }
      } catch (err) {
        console.error('[PDF stream error]:', err);
        return sendJson(res, 500, { success: false, message: 'Failed to stream PDF.' });
      }
    }

    // =====================================================================
    // 9I-3. POST /api/quiz/generate-from-pdf - Extract PDF & AI Generate Questions
    // =====================================================================
    if (url === '/api/quiz/generate-from-pdf' && method === 'POST') {
      if (!(await requireAdminRequest(req, res))) return;

      const body = await parseJsonBody(req);
      const { fileUrl, base64, count, topic, fileName } = body;

      let pdfBuffer: Buffer | null = null;

      try {
        if (base64 && typeof base64 === 'string') {
          const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '').replace(/^data:[^;]+;base64,/, '');
          pdfBuffer = Buffer.from(cleanBase64, 'base64');
        } else if (fileUrl && typeof fileUrl === 'string') {
          const decoded = decodeURIComponent(fileUrl.trim());
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            const resp = await fetch(decoded);
            if (!resp.ok) {
              return sendJson(res, 400, { success: false, error: `Could not download remote PDF (${resp.status} ${resp.statusText}).` });
            }
            const arrayBuf = await resp.arrayBuffer();
            pdfBuffer = Buffer.from(arrayBuf);
          } else {
            // Local file in public/uploads or public
            const clean = decoded.replace(/^\//, '');
            const candidates = [
              path.resolve(process.cwd(), 'public', clean),
              path.resolve(process.cwd(), 'public', 'uploads', path.basename(decoded)),
              path.resolve(process.cwd(), clean),
            ];
            for (const cand of candidates) {
              if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
                pdfBuffer = fs.readFileSync(cand);
                break;
              }
            }
          }
        }

        if (!pdfBuffer || pdfBuffer.length === 0) {
          return sendJson(res, 400, {
            success: false,
            error: 'No valid PDF file buffer or URL was provided. Please upload a PDF document.',
          });
        }

        // 1. Extract text and check scanned status
        const { text, numPages, isScanned } = await extractTextFromPdfBuffer(pdfBuffer);

        if (isScanned) {
          return sendJson(res, 400, {
            success: false,
            isScanned: true,
            error: 'The uploaded PDF appears to be a scanned document or contains no extractable text. Please upload a digital PDF with searchable text, or enter your quiz questions manually.',
          });
        }

        // 2. Call Gemini API to generate structured questions
        const questionCount = Math.min(10, Math.max(3, Number(count) || 5));
        const questions = await generateQuizQuestionsFromText(text, questionCount, topic || fileName || '');

        return sendJson(res, 200, {
          success: true,
          questions,
          page_count: numPages,
          extracted_preview: text.slice(0, 300).trim(),
          message: `Successfully extracted ${numPages} pages and generated ${questions.length} quiz questions.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Quiz PDF Generation Error]:', msg);
        return sendJson(res, 500, {
          success: false,
          error: `Failed to extract or generate questions from PDF: ${msg}`,
        });
      }
    }

    // =====================================================================
    // 9I-4. SKILL QUIZ API ENDPOINTS (Skill Development Assessment)
    // =====================================================================

    // 9E. GET /api/license/stream-video - Protected In-App Video Streaming with Range support & No-Download headers
    // 9E. GET /api/license/stream-video - Protected In-App Video Streaming with Range support & No-Download headers
    if (url === '/api/license/stream-video' && (method === 'GET' || method === 'HEAD')) {
      const parsedUrl = new URL(req.url || '', 'http://localhost');
      const targetUrl = parsedUrl.searchParams.get('url') || '';

      if (!targetUrl) {
        return sendJson(res, 400, { success: false, message: 'Missing video url parameter.' });
      }

      const decodedUrl = decodeURIComponent(targetUrl).trim();
      const publicDir = path.resolve(process.cwd(), 'public');
      const uploadsDir = path.resolve(publicDir, 'uploads');

      // Helper to determine exact video MIME type
      const getVideoMime = (filePathOrUrl: string): string => {
        const clean = filePathOrUrl.split('?')[0].toLowerCase();
        if (clean.endsWith('.webm')) return 'video/webm';
        if (clean.endsWith('.mov')) return 'video/quicktime';
        if (clean.endsWith('.ogg') || clean.endsWith('.ogv')) return 'video/ogg';
        if (clean.endsWith('.m4v')) return 'video/x-m4v';
        if (clean.endsWith('.mkv')) return 'video/x-matroska';
        if (clean.endsWith('.avi')) return 'video/x-msvideo';
        return 'video/mp4';
      };

      // Extract possible filename from targetUrl
      let extractedFileName = '';
      try {
        if (decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://')) {
          const u = new URL(decodedUrl);
          extractedFileName = path.basename(u.pathname);
        } else {
          extractedFileName = path.basename(decodedUrl.split('?')[0]);
        }
      } catch {
        extractedFileName = path.basename(decodedUrl.split('?')[0]);
      }

      // Candidate local paths
      const cleanPath = decodedUrl.replace(/^\//, '').split('?')[0];
      const candidates = [
        path.resolve(publicDir, cleanPath),
        path.resolve(uploadsDir, extractedFileName),
        path.resolve(publicDir, extractedFileName),
      ];

      // If targetUrl contains /uploads/, also test relative to uploadsDir
      if (decodedUrl.includes('/uploads/')) {
        const afterUploads = decodedUrl.split('/uploads/')[1].split('?')[0];
        candidates.push(path.resolve(uploadsDir, afterUploads));
        candidates.push(path.resolve(uploadsDir, decodeURIComponent(afterUploads)));
      }

      let localPathToServe: string | null = null;
      for (const cand of candidates) {
        try {
          if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
            localPathToServe = cand;
            break;
          }
        } catch {}
      }

      if (localPathToServe) {
        const stats = fs.statSync(localPathToServe);
        const fileSize = stats.size;
        const range = req.headers.range;
        const mimeType = getVideoMime(localPathToServe);

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          // Fast startup chunking for open-ended ranges (e.g. bytes=0-)
          const defaultChunkSize = 2 * 1024 * 1024; // 2MB
          const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + defaultChunkSize - 1, fileSize - 1);

          if (start >= fileSize) {
            res.statusCode = 416;
            res.setHeader('Content-Range', `bytes */${fileSize}`);
            res.end();
            return;
          }

          const chunksize = end - start + 1;
          const file = fs.createReadStream(localPathToServe, { start, end });
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': mimeType,
            'Content-Disposition': 'inline',
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Allow-Origin': '*',
          });
          file.pipe(res);
          return;
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': mimeType,
            'Content-Disposition': 'inline',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Allow-Origin': '*',
          });
          if (method === 'HEAD') {
            res.end();
            return;
          }
          fs.createReadStream(localPathToServe).pipe(res);
          return;
        }
      }

      // If remote video, proxy stream with Range support and appropriate auth headers
      try {
        const fetchHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        };
        if (req.headers.range) {
          fetchHeaders['range'] = req.headers.range as string;
        }

        // Support private Supabase Storage buckets if configured
        const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
        if (supabaseKey && targetUrl.includes('.supabase.co/storage/')) {
          fetchHeaders['apikey'] = supabaseKey;
          fetchHeaders['authorization'] = `Bearer ${supabaseKey}`;
        }

        const remoteRes = await fetch(targetUrl, {
          method: method as string,
          headers: fetchHeaders,
        });

        if (!remoteRes.ok && remoteRes.status !== 206) {
          // Check if fallback file exists locally by filename
          if (extractedFileName && fs.existsSync(path.resolve(uploadsDir, extractedFileName))) {
            const fallbackPath = path.resolve(uploadsDir, extractedFileName);
            const stats = fs.statSync(fallbackPath);
            res.writeHead(200, {
              'Content-Length': stats.size,
              'Content-Type': getVideoMime(fallbackPath),
              'Content-Disposition': 'inline',
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'public, max-age=3600',
              'X-Content-Type-Options': 'nosniff',
            });
            fs.createReadStream(fallbackPath).pipe(res);
            return;
          }

          return sendJson(res, remoteRes.status, {
            success: false,
            message: `Could not stream remote video (${remoteRes.status} ${remoteRes.statusText}).`,
          });
        }

        res.statusCode = remoteRes.status; // 206 or 200
        const contentType = remoteRes.headers.get('content-type') || getVideoMime(targetUrl);
        const contentRange = remoteRes.headers.get('content-range');
        const contentLength = remoteRes.headers.get('content-length');
        const acceptRanges = remoteRes.headers.get('accept-ranges') || 'bytes';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Accept-Ranges', acceptRanges);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentRange) {
          res.setHeader('Content-Range', contentRange);
        }
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }

        if (method === 'HEAD') {
          res.end();
          return;
        }

        if (remoteRes.body) {
          const { Readable } = await import('stream');
          // @ts-ignore
          const nodeStream = Readable.fromWeb(remoteRes.body as any);
          nodeStream.pipe(res);
          return;
        } else {
          res.end();
          return;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Video stream error]:', msg);
        return sendJson(res, 500, { success: false, message: `Failed to stream video: ${msg}` });
      }
    }

    // 10. GET /api/download - Protected File Download (Strictly Restricted for Ordinary Users on License Materials)
    if (url === '/api/download' && method === 'GET') {
      const parsedUrl = new URL(req.url || '', 'http://localhost');
      const targetUrl = parsedUrl.searchParams.get('url') || '';
      const rawFileName = parsedUrl.searchParams.get('filename') || 'lesson-file';
      const cleanFileName = decodeURIComponent(rawFileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const userRole = (req.headers['x-user-role'] as string) || parsedUrl.searchParams.get('role');

      // Security Policy: License Training curriculum is view-only for users
      const isLicenseContent =
        targetUrl.toLowerCase().includes('license') ||
        targetUrl.toLowerCase().includes('regulatory') ||
        targetUrl.toLowerCase().includes('compliance') ||
        targetUrl.toLowerCase().includes('underwriting') ||
        targetUrl.toLowerCase().includes('conduct') ||
        targetUrl.toLowerCase().includes('aml');

      if (isLicenseContent && userRole !== 'admin') {
        return sendJson(res, 403, {
          success: false,
          message: 'License Training curriculum is view-only to prevent unauthorized distribution and protect compliance curriculum. Direct downloading is disabled.',
        });
      }

      if (!targetUrl) {
        return sendJson(res, 400, { success: false, message: 'Missing file url.' });
      }

      // Check if it's a local file in public/uploads or public directory
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        const decodedUrl = decodeURIComponent(targetUrl);
        const cleanPath = decodedUrl.replace(/^\//, '');
        const publicDir = path.resolve(process.cwd(), 'public');
        const candidatePath = path.resolve(publicDir, cleanPath);
        const uploadsCandidate = path.resolve(publicDir, 'uploads', path.basename(decodedUrl));

        let localPathToServe: string | null = null;
        if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
          localPathToServe = candidatePath;
        } else if (fs.existsSync(uploadsCandidate) && fs.statSync(uploadsCandidate).isFile()) {
          localPathToServe = uploadsCandidate;
        }

        if (localPathToServe) {
          const stats = fs.statSync(localPathToServe);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}"`);
          res.setHeader('Content-Length', stats.size);
          const stream = fs.createReadStream(localPathToServe);
          stream.pipe(res);
          return;
        }
      }

      // If remote URL, fetch and stream with forced attachment disposition
      try {
        const remoteRes = await fetch(targetUrl);
        if (!remoteRes.ok) {
          return sendJson(res, remoteRes.status, { success: false, message: 'Could not fetch remote media.' });
        }

        const contentType = remoteRes.headers.get('content-type') || 'application/octet-stream';
        const contentLength = remoteRes.headers.get('content-length');

        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}"`);
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }

        if (remoteRes.body) {
          const { Readable } = await import('stream');
          // @ts-ignore
          const nodeStream = Readable.fromWeb(remoteRes.body as any);
          nodeStream.pipe(res);
          return;
        } else {
          res.end();
          return;
        }
      } catch (err) {
        console.error('[Download error]:', err);
        return sendJson(res, 500, { success: false, message: 'Download failed.' });
      }
    }

    // =====================================================================
    // 10. PRODUCT KNOWLEDGE HUB API ENDPOINTS
    // =====================================================================

    // =====================================================================
    // 11. COMPANY BULLETIN API ENDPOINTS (Announcements, Campaigns, Notices)
    // =====================================================================

    // Unknown /api route
    return sendJson(res, 404, { success: false, message: 'API route not found' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return sendJson(res, 500, { success: false, message });
  }
}
