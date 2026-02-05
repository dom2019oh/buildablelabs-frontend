import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, Bug, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  type: z.enum(["support", "bug"], { required_error: "Please select a topic" }),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    type: 'support',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof ContactForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleTypeChange = (type: 'support' | 'bug') => {
    setFormData(prev => ({ ...prev, type }));
    if (errors.type) {
      setErrors(prev => ({ ...prev, type: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactForm, string>> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ContactForm] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    // Create mailto link with form data
    const mailtoSubject = encodeURIComponent(`[${formData.type === 'bug' ? 'Bug Report' : 'Support'}] ${formData.subject}`);
    const mailtoBody = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nType: ${formData.type === 'bug' ? 'Bug Report' : 'Support Request'}\n\nMessage:\n${formData.message}`
    );
    
    window.location.href = `mailto:buildablelabs@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;

    toast({
      title: "Opening email client",
      description: "Your default email client should open with your message pre-filled.",
    });

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-zinc-800">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link 
          to="/" 
          className="inline-flex items-center text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
        <p className="text-zinc-400 mb-8">
          Have a question, need support, or found a bug? We'd love to hear from you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              What can we help you with?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('support')}
                className={`flex items-center justify-center gap-3 p-4 rounded-lg border transition-all ${
                  formData.type === 'support'
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-zinc-600 bg-zinc-700/50 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <HelpCircle className="h-5 w-5" />
                <span className="font-medium">Support</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('bug')}
                className={`flex items-center justify-center gap-3 p-4 rounded-lg border transition-all ${
                  formData.type === 'bug'
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-zinc-600 bg-zinc-700/50 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <Bug className="h-5 w-5" />
                <span className="font-medium">Bug Report</span>
              </button>
            </div>
            {errors.type && <p className="mt-2 text-sm text-red-400">{errors.type}</p>}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
              Your Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500 focus:border-purple-500"
            />
            {errors.name && <p className="mt-2 text-sm text-red-400">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
              Email Address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500 focus:border-purple-500"
            />
            {errors.email && <p className="mt-2 text-sm text-red-400">{errors.email}</p>}
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-white mb-2">
              Subject
            </label>
            <Input
              id="subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              placeholder={formData.type === 'bug' ? "Brief description of the bug" : "What do you need help with?"}
              className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500 focus:border-purple-500"
            />
            {errors.subject && <p className="mt-2 text-sm text-red-400">{errors.subject}</p>}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
              Message
            </label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder={
                formData.type === 'bug'
                  ? "Please describe the bug in detail. Include steps to reproduce, expected behavior, and what actually happened."
                  : "Please describe your question or issue in detail."
              }
              rows={6}
              className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500 focus:border-purple-500 resize-none"
            />
            {errors.message && <p className="mt-2 text-sm text-red-400">{errors.message}</p>}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
          >
            {isSubmitting ? (
              "Opening email client..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </form>

        {/* Direct Email */}
        <div className="mt-8 pt-8 border-t border-zinc-700">
          <p className="text-zinc-400 text-center">
            Or email us directly at{' '}
            <a 
              href="mailto:buildablelabs@gmail.com" 
              className="text-purple-400 hover:text-purple-300"
            >
              buildablelabs@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
