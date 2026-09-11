# Contact Form Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a contact form to the HomeScreen footer that allows users to send feedback/inquiries directly to the platform owner via email.

**Architecture:** 
- Frontend: Simple modal (similar to existing `ProfileModal`) with email + message fields, triggered by a footer link on HomeScreen
- Backend: New Vercel function `/api/contact` that validates the submission and sends an email via Resend
- State: Modal visibility managed in the root `App()` component, passed down to HomeScreen

**Tech Stack:**
- Frontend: React (no new libraries), plain form handling
- Backend: Vercel serverless functions + Resend API
- Styling: Existing design tokens (brown `#432A16`, spacing conventions from CONTRIBUTING.md)

## Global Constraints

- Only visible on HomeScreen (not in wizard, kids mode, or b2b mode)
- Email delivery via Resend (existing `RESEND_API_KEY`, `RESEND_FROM_EMAIL`)
- Keep UI minimal — no extra fields beyond email + message
- User-facing copy is Polish only
- Follow App.jsx file organization (no new component files, keep it in one file)

---

## Task 1: Create `/api/contact` Vercel Function

**Files:**
- Create: `api/contact.js`

**Interfaces:**
- Consumes: Environment variables `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `OWNER_EMAIL`
- Produces: POST endpoint returning `{ success: true/false, message?: string, error?: string }`

- [ ] **Step 1: Create the new endpoint file**

Create `api/contact.js`:

```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, message } = req.body;

  // Validation
  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.OWNER_EMAIL,
      subject: 'Nowa wiadomość ze strony — kontakt',
      html: `
        <p><strong>Nowa wiadomość ze strony kawiarnianiartysci.pl</strong></p>
        <p><strong>Od:</strong> ${email}</p>
        <p><strong>Wiadomość:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><em>Odpowiedź wysyłaj bezpośrednio na ten adres email.</em></p>
      `,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return res.status(500).json({ success: false, error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true, message: 'Message received' });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ success: false, error: 'Failed to send email' });
  }
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls -la api/contact.js
```

Expected: File exists with ~60 lines of code

- [ ] **Step 3: Commit**

```bash
git add api/contact.js
git commit -m "feat: add /api/contact endpoint for contact form submissions

- Accepts POST with email + message
- Validates required fields and email format
- Sends email to OWNER_EMAIL via Resend
- Returns success/error response

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add ContactModal Component to App.jsx

**Files:**
- Modify: `src/App.jsx` (add component, ~80 lines before `App()` component)

**Interfaces:**
- Consumes: `onClose` (function), `isOpen` (boolean)
- Produces: React component that renders a modal with email + message fields and "Wyślij" button

- [ ] **Step 1: Read App.jsx to find where to insert ContactModal**

Read lines 1-50 of `src/App.jsx` to see the component structure (components are defined before `App()`).

Expected: See pattern like `const ProfileModal = (props) => { ... }` or `function ProfileModal(props) { ... }`

- [ ] **Step 2: Add ContactModal component**

Find the line right before the `App()` function definition. Insert the ContactModal component there:

```javascript
const ContactModal = ({ isOpen, onClose, onSubmit }) => {
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Email je wymagany');
      return;
    }

    if (!message.trim()) {
      setError('Wiadomość jest wymagana');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Nie udało się wysłać. Spróbuj ponownie.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setEmail('');
      setMessage('');
      setLoading(false);

      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Contact form error:', err);
      setError('Nie udało się wysłać. Spróbuj ponownie.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>
          Skontaktuj się z nami
        </h2>

        <p style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
          Masz pytania o działanie platformy, uwagi czy jak możemy ci pomóc,
          napisz do nas postaramy się odpowiedziec jaknajszybciej...
        </p>

        {error && (
          <div style={{ color: '#d32f2f', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ color: '#388e3c', fontSize: '14px' }}>
            Dziękujemy! Otrzymaliśmy Twoją wiadomość, odpowiemy najszybciej jak
            potrafimy.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Twój email"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
                Wiadomość
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Twoja wiadomość"
                disabled={loading}
                rows="5"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#432A16',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Wysyłanie...' : 'Wyślij'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify the component is added**

Read the file around where you inserted it. Verify:
- Component is named `ContactModal`
- It accepts `isOpen`, `onClose`, `onSubmit` props
- Form has email + message fields
- Success message shows after submission

Expected: Component renders without syntax errors

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add ContactModal component to App.jsx

- Modal with email + message fields
- Form validation (required fields, email format)
- Submit handler posts to /api/contact
- Shows success message on completion
- Auto-closes after 2 seconds on success

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Modal State and Footer to HomeScreen

**Files:**
- Modify: `src/App.jsx` (add state in `App()` function, add footer to `HomeScreen`)

**Interfaces:**
- Consumes: `ContactModal` component from Task 2
- Produces: `isContactModalOpen` state, `setIsContactModalOpen` state setter, footer link in HomeScreen

- [ ] **Step 1: Add state to App() function**

Find the `function App()` definition. At the top of the function body (after any existing `const [state, setState]` declarations), add:

```javascript
const [isContactModalOpen, setIsContactModalOpen] = React.useState(false);
```

Example of where to place it (after other state vars):

```javascript
function App() {
  const [mode, setMode] = React.useState('client');
  const [path, setPath] = React.useState(null);
  // ... other state ...
  const [isContactModalOpen, setIsContactModalOpen] = React.useState(false);  // ADD HERE
```

- [ ] **Step 2: Pass modal state to HomeScreen**

Find where `HomeScreen` is rendered in the `App()` function. It should look something like:

```javascript
{mode === 'client' && !path && (
  <HomeScreen ... />
)}
```

Add two new props to the `HomeScreen` call:

```javascript
{mode === 'client' && !path && (
  <HomeScreen 
    {...existing props}
    onContactClick={() => setIsContactModalOpen(true)}
  />
)}
```

- [ ] **Step 3: Update HomeScreen function signature**

Find the `HomeScreen` component definition (defined as `const HomeScreen = (props) => { ... }`). Add the new prop to the destructuring:

Change from:
```javascript
const HomeScreen = ({ prop1, prop2, ... }) => {
```

To:
```javascript
const HomeScreen = ({ prop1, prop2, ..., onContactClick }) => {
```

- [ ] **Step 4: Add footer to HomeScreen**

Find the last element in the HomeScreen JSX (usually before the closing `</div>`). Add this footer:

```javascript
<div
  style={{
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center',
  }}
>
  <button
    onClick={onContactClick}
    style={{
      background: 'none',
      border: 'none',
      color: '#432A16',
      cursor: 'pointer',
      fontSize: '14px',
      textDecoration: 'underline',
      padding: '8px',
    }}
  >
    Skontaktuj się z nami
  </button>
</div>
```

- [ ] **Step 5: Render ContactModal in App**

Find the closing `</div>` of the `App()` function's return statement. Before the closing `</div>`, add:

```javascript
<ContactModal
  isOpen={isContactModalOpen}
  onClose={() => setIsContactModalOpen(false)}
/>
```

- [ ] **Step 6: Verify the changes**

Review App.jsx and check:
- `isContactModalOpen` state is defined
- `HomeScreen` receives `onContactClick` prop
- HomeScreen renders a footer with "Skontaktuj się z nami" button
- `ContactModal` is rendered with correct props
- No syntax errors

Expected: App renders without errors

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add contact form modal state and footer to HomeScreen

- Add isContactModalOpen state to App
- Pass onContactClick handler to HomeScreen
- Add footer link 'Skontaktuj się z nami' to HomeScreen
- Render ContactModal with state management

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Test the Complete Flow End-to-End

**Files:**
- No new files created

**Interfaces:**
- Consumes: All components from Tasks 1-3
- Produces: Verified working contact form

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: Vite dev server runs on http://localhost:5173 (or similar), React app loads

- [ ] **Step 2: Navigate to home screen**

Open http://localhost:5173 in a browser. You should see the home screen with wizard options.

Expected: HomeScreen is visible

- [ ] **Step 3: Scroll to footer and click "Skontaktuj się z nami"**

Scroll to the bottom of the page. Look for the "Skontaktuj się z nami" link (should be in a footer area above the page end).

Click it.

Expected: ContactModal opens with email + message fields visible

- [ ] **Step 4: Test validation (empty submission)**

Try clicking "Wyślij" without filling any fields.

Expected: Error message "Email je wymagany" appears

- [ ] **Step 5: Test validation (invalid email)**

Enter:
- Email: `notanemail`
- Message: `Test message`

Click "Wyślij".

Expected: Modal is still open (form is client-side validated but Resend will also reject it)

- [ ] **Step 6: Test successful submission**

Enter:
- Email: `test@example.com`
- Message: `Test feedback message`

Click "Wyślij".

Expected:
- Button shows "Wysyłanie..." while loading
- Success message appears: "Dziękujemy! Otrzymaliśmy Twoją wiadomość, odpowiemy najszybciej jak potrafimy."
- Modal closes after ~2 seconds

- [ ] **Step 7: Check browser console for errors**

Open browser DevTools (F12) → Console tab.

Expected: No red error messages (warnings are OK)

- [ ] **Step 8: Stop the dev server**

```bash
# Press Ctrl+C in the terminal running the dev server
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "test: verify contact form end-to-end flow

- Tested modal open/close
- Tested form validation (empty, invalid email)
- Tested successful submission
- Verified success message and auto-close

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Verify Production Build and Deploy

**Files:**
- No new files

**Interfaces:**
- Consumes: All components from Tasks 1-4

- [ ] **Step 1: Build for production**

```bash
npm run build
```

Expected: Build completes without errors, generates `dist/` folder

- [ ] **Step 2: Check build size**

```bash
ls -lh dist/assets/
```

Expected: Bundle is a reasonable size (no major bloat from new code)

- [ ] **Step 3: Push to main branch**

```bash
git log --oneline -5
```

Expected: See the 4 commits you made (contact form endpoint, modal component, state + footer, testing)

Then push:

```bash
git push origin main
```

Expected: Push succeeds, Vercel auto-deploys

- [ ] **Step 4: Verify live site**

Wait 1-2 minutes for Vercel to deploy. Then open https://www.kawiarnianiartysci.pl in a browser.

Scroll to footer and click "Skontaktuj się z nami".

Expected: Modal opens and works as expected on live site

- [ ] **Step 5: Final commit**

If everything works on live, mark as complete:

```bash
git log --oneline -1
```

Expected: See the most recent commit

