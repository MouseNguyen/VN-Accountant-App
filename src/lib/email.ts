// src/lib/email.ts
// Email service sử dụng Resend
// Gửi email xác thực và reset password

import { Resend } from 'resend';
import { env, isEmailEnabled } from '@/env';

// ==========================================
// RESEND CLIENT
// ==========================================

let resend: Resend | null = null;

if (isEmailEnabled()) {
    resend = new Resend(env.RESEND_API_KEY);
}

// ==========================================
// EMAIL TEMPLATES
// ==========================================

const EMAIL_HEADER = `
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🌾 LABA ERP</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Quản lý tài chính đơn giản cho nông trại</p>
  </div>
`;

const EMAIL_FOOTER = `
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
    <p style="color: #6c757d; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} LABA ERP. Tất cả các quyền được bảo lưu.
    </p>
    <p style="color: #adb5bd; font-size: 11px; margin: 8px 0 0 0;">
      Email này được gửi tự động, vui lòng không trả lời.
    </p>
  </div>
`;

function wrapEmailTemplate(content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        ${EMAIL_HEADER}
        ${content}
        ${EMAIL_FOOTER}
      </div>
    </body>
    </html>
  `;
}

// ==========================================
// SEND VERIFICATION EMAIL
// ==========================================

export interface SendEmailResult {
    success: boolean;
    error?: string;
}

/**
 * Gửi email xác thực với OTP 6 số
 */
export async function sendVerificationEmail(
    email: string,
    userName: string,
    otp: string
): Promise<SendEmailResult> {
    if (!resend) {
        console.warn('Email service disabled: RESEND_API_KEY not configured');
        console.log(`[DEV] Verification OTP for ${email}: ${otp}`);
        return { success: true }; // Fake success trong development
    }

    const content = `
    <div style="padding: 30px;">
      <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
        Xin chào <strong>${userName}</strong>!
      </p>
      <p style="color: #555; font-size: 15px; margin: 0 0 25px 0;">
        Cảm ơn bạn đã đăng ký tài khoản LABA ERP. Vui lòng nhập mã OTP bên dưới để xác thực email:
      </p>
      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; text-align: center; border-radius: 12px; margin: 0 0 25px 0;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #667eea; font-family: monospace;">
          ${otp}
        </span>
      </div>
      <p style="color: #dc3545; font-size: 14px; margin: 0 0 15px 0;">
        ⏰ <strong>Mã này sẽ hết hạn sau 15 phút.</strong>
      </p>
      <p style="color: #6c757d; font-size: 13px; margin: 0;">
        Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
      </p>
    </div>
  `;

    try {
        await resend.emails.send({
            from: env.EMAIL_FROM,
            to: email,
            subject: `[LABA ERP] Mã xác thực: ${otp}`,
            html: wrapEmailTemplate(content),
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send verification email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ==========================================
// SEND PASSWORD RESET EMAIL
// ==========================================

/**
 * Gửi email reset password với link
 */
export async function sendPasswordResetEmail(
    email: string,
    userName: string,
    token: string
): Promise<SendEmailResult> {
    const resetLink = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    if (!resend) {
        console.warn('Email service disabled: RESEND_API_KEY not configured');
        console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);
        return { success: true }; // Fake success trong development
    }

    const content = `
    <div style="padding: 30px;">
      <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
        Xin chào <strong>${userName}</strong>!
      </p>
      <p style="color: #555; font-size: 15px; margin: 0 0 25px 0;">
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tiếp tục:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102,126,234,0.4);">
          Đặt lại mật khẩu
        </a>
      </div>
      <p style="color: #dc3545; font-size: 14px; margin: 0 0 15px 0;">
        ⏰ <strong>Link này sẽ hết hạn sau 15 phút.</strong>
      </p>
      <p style="color: #6c757d; font-size: 13px; margin: 0 0 10px 0;">
        Nếu nút không hoạt động, bạn có thể copy link sau vào trình duyệt:
      </p>
      <p style="color: #667eea; font-size: 12px; word-break: break-all; margin: 0;">
        ${resetLink}
      </p>
      <hr style="border: none; border-top: 1px solid #e9ecef; margin: 25px 0;">
      <p style="color: #6c757d; font-size: 13px; margin: 0;">
        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. 
        Tài khoản của bạn vẫn an toàn.
      </p>
    </div>
  `;

    try {
        await resend.emails.send({
            from: env.EMAIL_FROM,
            to: email,
            subject: '[LABA ERP] Đặt lại mật khẩu',
            html: wrapEmailTemplate(content),
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ==========================================
// SEND WELCOME EMAIL
// ==========================================

/**
 * Gửi email chào mừng sau khi xác thực thành công
 */
export async function sendWelcomeEmail(
    email: string,
    userName: string,
    farmName: string
): Promise<SendEmailResult> {
    if (!resend) {
        console.warn('Email service disabled: RESEND_API_KEY not configured');
        return { success: true };
    }

    const content = `
    <div style="padding: 30px;">
      <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
        🎉 Chào mừng <strong>${userName}</strong>!
      </p>
      <p style="color: #555; font-size: 15px; margin: 0 0 20px 0;">
        Tài khoản của bạn đã được xác thực thành công. Bạn đã sẵn sàng sử dụng LABA ERP để quản lý tài chính cho <strong>${farmName}</strong>.
      </p>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="color: #333; font-size: 14px; margin: 0 0 15px 0; font-weight: 600;">
          Với LABA ERP, bạn có thể:
        </p>
        <ul style="color: #555; font-size: 14px; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;">📊 Theo dõi thu chi hàng ngày</li>
          <li style="margin-bottom: 8px;">🛒 Quản lý bán hàng và mua hàng</li>
          <li style="margin-bottom: 8px;">👷 Chấm công và trả lương nhân công</li>
          <li style="margin-bottom: 8px;">📱 Scan hóa đơn tự động với OCR</li>
        </ul>
      </div>
      <div style="text-align: center;">
        <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard" 
           style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Bắt đầu sử dụng
        </a>
      </div>
    </div>
  `;

    try {
        await resend.emails.send({
            from: env.EMAIL_FROM,
            to: email,
            subject: '🎉 Chào mừng đến với LABA ERP!',
            html: wrapEmailTemplate(content),
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
