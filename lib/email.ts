import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  console.log('[Email] sendEmail function called');
  
  // 在运行时检查并初始化 Resend，避免构建时检查环境变量
  if (!process.env.RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY is not set');
    console.error('[Email] Configuration error:', error.message);
    console.error('[Email] Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
    });
    throw error;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  
  console.log('[Email] Attempting to send email:', {
    to,
    from: fromEmail,
    subject,
    hasApiKey: !!process.env.RESEND_API_KEY,
    apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 5) + '...',
    htmlLength: html.length,
  });
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Resend API error:', {
        error,
        message: error.message,
        name: error.name,
        to,
        from: fromEmail,
        errorType: typeof error,
        errorString: JSON.stringify(error, null, 2),
      });
      throw new Error(`Failed to send email: ${error.message || JSON.stringify(error)}`);
    }

    console.log('[Email] Email sent successfully:', {
      id: data?.id,
      to,
      from: fromEmail,
      data: JSON.stringify(data, null, 2),
    });

    return data;
  } catch (sendError: unknown) {
    const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
    console.error('[Email] Exception during send:', {
      error: errorMessage,
      stack: sendError instanceof Error ? sendError.stack : undefined,
      to,
      from: fromEmail,
    });
    throw sendError;
  }
}

