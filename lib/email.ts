import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  // 在运行时检查并初始化 Resend，避免构建时检查环境变量
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const { data, error } = await resend.emails.send({
    from: from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Resend email error:', error);
    throw error;
  }

  return data;
}

