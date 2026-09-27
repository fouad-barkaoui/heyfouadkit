import { Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FieldRow, Label, TextInput, TextArea } from '@/components/ui/Field';
import { useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';

export function ContactPage(): JSX.Element {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (!subject.trim() || !message.trim() || !email.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // Send contact form data to your backend or email service
      // This is a placeholder - implement according to your backend setup
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          email,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitted(true);
      setSubject('');
      setMessage('');
      window.setTimeout(() => setSubmitted(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <h1 className="text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper">
          {t('contact.title')}
        </h1>
        <p className="mt-1 text-[12.5px] text-ash">{t('contact.message')}</p>
      </header>

      <div className="scroll-y min-h-0 flex-1 px-4 py-5 md:px-7 md:py-6">
        <div className="mx-auto max-w-[480px]">
          {submitted ? (
            <div className="rounded-[8px] bg-acid/10 p-4 text-center">
              <p className="text-[12.5px] font-medium text-acid">
                ✓ Thank you! Your message has been sent.
              </p>
              <p className="mt-1.5 text-[11px] text-acid/70">
                We'll review your feedback and get back to you soon.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <FieldRow>
                <Label htmlFor="contact-email">Email</Label>
                <TextInput
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={!!user?.email}
                />
              </FieldRow>

              <FieldRow>
                <Label htmlFor="contact-subject">Subject</Label>
                <TextInput
                  id="contact-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What is this about?"
                />
              </FieldRow>

              <FieldRow>
                <Label htmlFor="contact-message">Message</Label>
                <TextArea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you think, suggest improvements, or report issues..."
                  rows={8}
                />
              </FieldRow>

              {error ? (
                <p className="text-[12px] text-coral">{error}</p>
              ) : null}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSubject('');
                    setMessage('');
                  }}
                  disabled={busy || (!subject && !message)}
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  disabled={busy || !subject.trim() || !message.trim()}
                  onClick={() => void handleSubmit()}
                  className="flex-1"
                >
                  <Send size={14} strokeWidth={2} />
                  Send message
                </Button>
              </div>

              <div className="mt-6 border-t border-graphite pt-4">
                <p className="text-[11px] text-ash">
                  <strong>Feature suggestions:</strong> Have an idea for the platform?
                  Let us know! We read all feedback and use it to guide development.
                </p>
                <p className="mt-2 text-[11px] text-ash">
                  <strong>Bug reports:</strong> Found something broken? Please describe
                  the steps to reproduce it so we can fix it quickly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
