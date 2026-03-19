const nodemailer = require('nodemailer');

// Set up your transporter (for testing, use Ethereal or hardcode credentials, ideally these should be in .env)
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use other services
  auth: {
    user: 'library.management.test.dummy@gmail.com', // Replace with your real or test email
    pass: 'dummy-password', // Replace with app password
  }
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: '"Library System" <library.management.test.dummy@gmail.com>',
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = {
  sendEmail
};