import express from "express";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim();

const page = (title, body) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — GigLink</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #1a1a1a; }
      h1 { font-size: 1.5rem; }
      h2 { font-size: 1.15rem; margin-top: 1.5rem; }
      a { color: #2563eb; }
      footer { margin-top: 2rem; font-size: 0.85rem; color: #666; }
    </style>
  </head>
  <body>
    ${body}
    <footer>GigLink</footer>
  </body>
</html>`;

const router = express.Router();

router.get("/privacy", (req, res) => {
  res.send(
    page(
      "Privacy Policy",
      `<h1>Privacy Policy</h1>
       <p>GigLink helps workers and employers connect for gig work.</p>
       <h2>Information we collect</h2>
       <p>When you use GigLink we may collect: your name, email address, phone number, your role (worker or employer), and the profile information you add (for example bio, skills, company name, location, and profile photo or logo). We also store the jobs you post or apply to, assignments, ratings and reviews, and device push-notification tokens so we can alert you about activity on your account.</p>
       <h2>How we use it</h2>
       <p>We use this information to operate the marketplace: matching workers with jobs, processing applications and assignments, showing profiles and reviews, and sending you notifications about activity relevant to you.</p>
       <h2>Account deletion</h2>
       <p>You can delete your account from the Profile tab in the GigLink app. Personal profile data is removed and your account can no longer be used to sign in. Job history, applications, assignments, and reviews you were part of are kept in anonymized form so other users' records remain intact.</p>`
    )
  );
});

router.get("/terms", (req, res) => {
  res.send(
    page(
      "Terms of Service",
      `<h1>Terms of Service</h1>
       <p>By using GigLink you agree to use the marketplace for its intended purpose: posting and applying to gig work, managing assignments, and rating completed work.</p>
       <h2>Your responsibilities</h2>
       <p>You are responsible for the accuracy of the information you provide, and for completing the work or payments you agree to. Misuse, fraud, or interfering with other users' accounts may result in your account being removed.</p>
       <h2>Accounts</h2>
       <p>You must keep your login details secure. You can delete your account at any time from the Profile tab.</p>`
    )
  );
});

router.get("/contact", (req, res) => {
  const contact = SUPPORT_EMAIL
    ? `<p>For support or questions, email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`
    : `<p>For support, please use the contact options available inside the GigLink app.</p>`;
  res.send(
    page(
      "Contact & Support",
      `<h1>Contact & Support</h1>
       ${contact}
       <p>Before contacting us, try the in-app FAQ and profile settings.</p>`
    )
  );
});

router.get("/delete-account", (req, res) => {
  res.send(
    page(
      "Deleting your GigLink account",
      `<h1>Deleting your account</h1>
       <p>You can delete your GigLink account from the app: open your Profile tab, scroll to the Account section, and tap &ldquo;Delete Account&rdquo;. You will be asked to confirm.</p>
       <h2>What happens</h2>
       <p>Your personal profile data is removed and you can no longer sign in with that account. Jobs, applications, assignments, and reviews you were part of remain in anonymized form so other users' records are not broken.</p>
       <h2>Can I come back?</h2>
       <p>Deletion is permanent. You may create a new account later, but the deleted account itself cannot be restored.</p>`
    )
  );
});

export default router;
