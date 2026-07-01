// backend/src/utils/email.js
const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Vicharanshala Lab <noreply@vicharanshala.iitropar.ac.in>',
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email send failed to ${to}:`, error);
    throw error;
  }
};

const emailTemplates = {
  verification: (name, verificationUrl) => ({
    subject: 'Verify your email - Vicharanshala Lab',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Vicharanshala Lab</h1>
          <p style="color: #93c5fd; margin: 5px 0 0;">IIT Ropar Knowledge Platform</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e3a5f;">Welcome, ${name}!</h2>
          <p style="color: #475569;">Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">This link expires in 24 hours. If you didn't register, ignore this email.</p>
        </div>
      </div>
    `,
  }),
  
  passwordReset: (name, resetUrl) => ({
    subject: 'Reset your password - Vicharanshala Lab',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e3a5f;">Hi ${name},</h2>
          <p style="color: #475569;">We received a request to reset your password. Click below to reset it.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #ef4444; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      </div>
    `,
  }),

  newAnswer: (recipientName, questionTitle, answererName, questionUrl) => ({
    subject: `New answer on "${questionTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Vicharanshala Lab</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <p style="color: #475569;">Hi <strong>${recipientName}</strong>,</p>
          <p style="color: #475569;"><strong>${answererName}</strong> answered your question:</p>
          <blockquote style="border-left: 4px solid #2563eb; padding-left: 15px; color: #1e3a5f; font-weight: bold;">${questionTitle}</blockquote>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${questionUrl}" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              View Answer
            </a>
          </div>
        </div>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
