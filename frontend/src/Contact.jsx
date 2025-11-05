import { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubmitted(true);
    setLoading(false);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Get in Touch</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Have questions about Voyage AI? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="lg:col-span-1 space-y-6">
            <ContactCard
              icon="📧"
              title="Email Us"
              content="support@voyageai.com"
              description="We'll respond within 24 hours"
            />
            <ContactCard
              icon="📞"
              title="Call Us"
              content="+91 98765 43210"
              description="Mon-Fri, 9AM-6PM IST"
            />
            <ContactCard
              icon="📍"
              title="Visit Us"
              content="Delhi, India"
              description="By appointment only"
            />
            <ContactCard
              icon="💬"
              title="Live Chat"
              content="Chat with AI Assistant"
              description="Available 24/7"
            />
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-200">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                    <span className="text-4xl">✅</span>
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900 mb-2">Message Sent!</h3>
                  <p className="text-neutral-600">
                    Thank you for contacting us. We'll get back to you soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </span>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-neutral-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <FAQCard
              question="How does the AI trip planner work?"
              answer="Our AI analyzes your preferences, budget, and dates to create personalized trip recommendations with real flights and hotels."
            />
            <FAQCard
              question="Is the multi-agent system free?"
              answer="Yes! The multi-agent analysis feature is completely free to use for all registered users."
            />
            <FAQCard
              question="Can I modify my trip after planning?"
              answer="Absolutely! You can edit dates, budget, and preferences anytime and regenerate your trip plan."
            />
            <FAQCard
              question="How accurate are the prices?"
              answer="We fetch real-time prices from Amadeus API for flights and hotels, ensuring accuracy."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCard({ icon, title, content, description }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-200 hover:shadow-lg transition-all">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-neutral-900 mb-1">{title}</h3>
      <p className="text-indigo-600 font-semibold mb-1">{content}</p>
      <p className="text-sm text-neutral-500">{description}</p>
    </div>
  );
}

function FAQCard({ question, answer }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-200 hover:shadow-md transition-all">
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{question}</h3>
      <p className="text-neutral-600 text-sm">{answer}</p>
    </div>
  );
}