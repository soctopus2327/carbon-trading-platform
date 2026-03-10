const nodemailer = require("nodemailer");

async function getTransporter() {
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// ── Notify admin when a new company registers ──
exports.sendCompanyRegistrationAlert = async (companyName, companyEmail, companyType) => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"Carbon Trading Platform" <admin@desis.com>',
      to: "platformadmin@desis.com",
      subject: `🏢 New Company Registration — ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #4f46e5;">New Company Registration Request</h2>
          <p>A new company has registered and is awaiting your approval.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e0e0e0;">Company Name</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${companyName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e0e0e0;">Email</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${companyEmail}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e0e0e0;">Type</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${companyType}</td>
            </tr>
          </table>
          <a href="http://localhost:5173/admin" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Review in Admin Panel
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Carbon Trading Platform — Desis 2025</p>
        </div>
      `
    });
    console.log("✅ Registration alert sent! Preview:", nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("❌ Failed to send registration email:", err.message);
  }
};

// ── Notify company when approved ──
exports.sendApprovalEmail = async (companyName, companyEmail) => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"Carbon Trading Platform" <admin@desis.com>',
      to: companyEmail,
      subject: `✅ Your Company Has Been Approved — ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #16a34a;">🎉 Congratulations! Your Company is Approved</h2>
          <p>Dear <strong>${companyName}</strong>,</p>
          <p>Your company registration has been <strong style="color: #16a34a;">approved</strong>. You can now access all features of the Carbon Trading Platform.</p>
          <a href="http://localhost:5173" style="background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Login to Platform
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Carbon Trading Platform — Desis 2025</p>
        </div>
      `
    });
    console.log("✅ Approval email sent! Preview:", nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("❌ Failed to send approval email:", err.message);
  }
};

// ── Notify company when rejected ──
exports.sendRejectionEmail = async (companyName, companyEmail, reason) => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"Carbon Trading Platform" <admin@desis.com>',
      to: companyEmail,
      subject: `❌ Company Registration Rejected — ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #dc2626;">Company Registration Rejected</h2>
          <p>Dear <strong>${companyName}</strong>,</p>
          <p>Unfortunately your company registration has been <strong style="color: #dc2626;">rejected</strong>.</p>
          ${reason ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Reason:</strong> ${reason}
          </div>` : ""}
          <p>If you believe this is a mistake, please contact the platform administrator.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Carbon Trading Platform — Desis 2025</p>
        </div>
      `
    });
    console.log("✅ Rejection email sent! Preview:", nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("❌ Failed to send rejection email:", err.message);
  }
};

// ── Notify company when blocked ──
exports.sendBlockEmail = async (companyName, companyEmail, reason) => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"Carbon Trading Platform" <admin@desis.com>',
      to: companyEmail,
      subject: `🚫 Your Company Has Been Blocked — ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #d97706;">Company Account Blocked</h2>
          <p>Dear <strong>${companyName}</strong>,</p>
          <p>Your company account has been <strong style="color: #d97706;">blocked</strong> by the platform admin.</p>
          ${reason ? `
          <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Reason:</strong> ${reason}
          </div>` : ""}
          <p>Please contact the platform administrator for more information.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Carbon Trading Platform — Desis 2025</p>
        </div>
      `
    });
    console.log("✅ Block email sent! Preview:", nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("❌ Failed to send block email:", err.message);
  }
};
// ```

// Replace your entire `emailService.js` with this. Then restart the server and register a new company — you should see in the terminal:
// ```
// ✅ Registration alert sent! Preview: https://ethereal.email/message/abc123