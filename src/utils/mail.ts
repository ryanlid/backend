import nodemailer from 'nodemailer';

/**
 * to 收件人，多个收件人 用英文逗号隔开
 * subject 邮件标题
 * html 邮件正文
 * @param {*} { to, subject, html }
 */

interface MailType {
  to: string;
  subject: string;
  text: string|undefined;
  html: string;
}
async function mail({ to, subject, text, html }: MailType) {
  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSEORD,
    },
  });
  // send mail with defined transport object
  try {
    await transporter.sendMail({
      from: `${process.env.FORM_NAME}<${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      text,
      html,
      replyTo: process.env.REPLY_TO,
    });
    return {
      result: true,
    };
  } catch (error) {
    return {
      result: false,
      error,
    };
  }
}

export default mail;
