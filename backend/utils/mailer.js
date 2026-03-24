const nodemailer = require('nodemailer');

// ==========================================
// EMAIL TRANSPORT CONFIGURATION
// ==========================================
// This establishes the "SMTP" configuration required to actually fire emails securely.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com', // Typically Gmail SMTP via app-passwords if free
  port: process.env.SMTP_PORT || 587,              // 587 indicates a TLS encrypted portal
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,                   // Your app email address (e.g. library@gmail.com)
    pass: process.env.SMTP_PASS,                   // App-specific password 
  },
});

// ==========================================
// SEND EMAIL HELPER FUNCTION
// ==========================================
// Takes the payload generated from other controllers (like issueController checking out a book)
// and handles routing the physical dispatch.
const sendEmail = async (to, subject, text, html) => {
  try {
    // Only attempt to fire the physical email if credentials are bound, 
    // to prevent crashing the dev-server constantly if SMTP isn't configured yet.
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Mail credentials not setup, skipping email to:', to);
      return;
    }

    // Command nodemail to execute the email blast
    const info = await transporter.sendMail({
      from: `"Library Management" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text, // Plain text alternative (older non-HTML email apps)
      html, // Stylish rich payload built in the issue/return controller
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = { sendEmail };
