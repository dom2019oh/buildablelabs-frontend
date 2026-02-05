import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-zinc-800">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link 
          to="/" 
          className="inline-flex items-center text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="space-y-8 text-zinc-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to Buildable Labs ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
            <p>
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium text-white mb-3">2.1 Personal Information</h3>
            <p className="mb-4">We may collect personal information that you voluntarily provide to us when you:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Register for an account</li>
              <li>Subscribe to our services</li>
              <li>Fill out a form or survey</li>
              <li>Contact us for support</li>
              <li>Participate in promotions or contests</li>
            </ul>
            <p className="mb-4">This information may include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and email address</li>
              <li>Billing address and payment information</li>
              <li>Phone number</li>
              <li>Username and password</li>
              <li>Profile information and preferences</li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-3 mt-6">2.2 Automatically Collected Information</h3>
            <p className="mb-4">When you access our services, we automatically collect certain information, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Device information (browser type, operating system, device type)</li>
              <li>IP address and location data</li>
              <li>Usage data (pages visited, time spent, click patterns)</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Referring URLs and search terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect for various purposes, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Providing, maintaining, and improving our services</li>
              <li>Processing transactions and sending related information</li>
              <li>Sending promotional communications (with your consent)</li>
              <li>Responding to your comments, questions, and requests</li>
              <li>Analyzing usage patterns to enhance user experience</li>
              <li>Detecting, preventing, and addressing technical issues</li>
              <li>Protecting against fraudulent or unauthorized activity</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Cookies and Tracking Technologies</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to collect and store information about your preferences and activity on our site. Types of cookies we use include:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong className="text-white">Essential Cookies:</strong> Required for basic site functionality</li>
              <li><strong className="text-white">Analytics Cookies:</strong> Help us understand how visitors interact with our site</li>
              <li><strong className="text-white">Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong className="text-white">Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
            </ul>
            <p>
              You can control cookies through your browser settings. However, disabling certain cookies may limit your ability to use some features of our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Information Sharing and Disclosure</h2>
            <p className="mb-4">We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Service Providers:</strong> Third-party vendors who assist in providing our services</li>
              <li><strong className="text-white">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong className="text-white">Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong className="text-white">With Your Consent:</strong> When you have given us permission to share</li>
            </ul>
            <p className="mt-4">
              We do not sell your personal information to third parties for their marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication measures</li>
              <li>Employee training on data protection</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this privacy policy, unless a longer retention period is required or permitted by law. When we no longer need your information, we will securely delete or anonymize it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Your Rights and Choices</h2>
            <p className="mb-4">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Access:</strong> Request a copy of your personal information</li>
              <li><strong className="text-white">Correction:</strong> Request correction of inaccurate information</li>
              <li><strong className="text-white">Deletion:</strong> Request deletion of your personal information</li>
              <li><strong className="text-white">Portability:</strong> Request transfer of your data to another service</li>
              <li><strong className="text-white">Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong className="text-white">Restrict Processing:</strong> Limit how we use your information</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Children's Privacy</h2>
            <p>
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. We take appropriate safeguards to ensure your information remains protected in accordance with this privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Us</h2>
            <p className="mb-4">
              If you have questions or concerns about this privacy policy or our data practices, please contact us at:
            </p>
            <div className="bg-zinc-700 rounded-lg p-4">
              <p className="text-white font-medium">Buildable Labs</p>
              <p>Email: <a href="mailto:buildablelabs@gmail.com" className="text-purple-400 hover:text-purple-300">buildablelabs@gmail.com</a></p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-700">
          <div className="flex flex-wrap gap-4">
            <Link to="/terms" className="text-purple-400 hover:text-purple-300">
              Terms of Service
            </Link>
            <span className="text-zinc-600">|</span>
            <Link to="/" className="text-purple-400 hover:text-purple-300">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
