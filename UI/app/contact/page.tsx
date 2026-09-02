"use client";
import { useState } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import { ApiError, apiSend } from "@/lib/api/client";
import { validateEmail } from "@/lib/validation/contact";

type FormState = "idle" | "loading" | "success" | "error";

export default function ContactPage() {
  const [submissionType, setSubmissionType] = useState("");
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // `type="email"` alone is not a guarantee — it is skipped whenever the
    // form is submitted programmatically, and says nothing on older browsers.
    const emailError = validateEmail(email, { label: "Email address", required: true });
    if (emailError) {
      setErrorMsg(emailError);
      setState("error");
      return;
    }
    setState("loading");
    setErrorMsg("");
    try {
      await apiSend("POST", "submissions", {
        submissionType, name, organisation, email, subject, message,
      });
      setState("success");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : "Network error — please check your connection and try again."
      );
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <>
        <Header />
        <main>
          <section className="bg-primary-800 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-primary-300 text-sm font-semibold mb-1 uppercase tracking-wider">Get in Touch</div>
              <h1 className="text-3xl font-extrabold mb-2">Contact & Submit Information</h1>
            </div>
          </section>
          <section className="py-20 bg-gray-50 flex items-center justify-center">
            <div className="max-w-md mx-auto text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl mx-auto mb-6">
                ✅
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Submission Received!</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Thank you, <strong>{name}</strong>. Your submission has been received and saved.
                Our team will review it and respond to <strong>{email}</strong> within 5 business days.
              </p>
              <button
                onClick={() => { setState("idle"); setName(""); setEmail(""); setSubject(""); setMessage(""); setOrganisation(""); setSubmissionType(""); }}
                className="px-6 py-2.5 bg-primary-700 text-white font-semibold rounded-lg hover:bg-primary-800 transition-colors text-sm"
              >
                Submit Another
              </button>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main>
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-primary-300 text-sm font-semibold mb-1 uppercase tracking-wider">Get in Touch</div>
            <h1 className="text-3xl font-extrabold mb-2">Contact & Submit Information</h1>
            <p className="text-green-200 max-w-xl">
              Have a project, technology, or organisation to submit? Questions about the platform? Reach out to the Agri-Energy Desk team.
            </p>
          </div>
        </section>

        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10">
              {/* Submission form */}
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-card">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Submit Information</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Use this form to submit details about a project, technology, partner organisation, or resource. Our team will review and publish to the platform.
                </p>

                {state === "error" && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                    {errorMsg}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="contact-type" className="block text-xs font-semibold text-gray-600 mb-1">Submission Type *</label>
                    <select
                      id="contact-type"
                      className="form-input"
                      required
                      value={submissionType}
                      onChange={(e) => setSubmissionType(e.target.value)}
                    >
                      <option value="">Select type...</option>
                      <option>Project</option>
                      <option>Technology</option>
                      <option>Partner Organisation</option>
                      <option>Resource / Publication</option>
                      <option>General Enquiry</option>
                    </select>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-semibold text-gray-600 mb-1">Your Name *</label>
                      <input
                        id="contact-name"
                        type="text"
                        className="form-input"
                        placeholder="Full name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-org" className="block text-xs font-semibold text-gray-600 mb-1">Organisation</label>
                      <input
                        id="contact-org"
                        type="text"
                        className="form-input"
                        placeholder="Your organisation"
                        value={organisation}
                        onChange={(e) => setOrganisation(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-semibold text-gray-600 mb-1">Email Address *</label>
                    <input
                      id="contact-email"
                      type="email"
                      className="form-input"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="block text-xs font-semibold text-gray-600 mb-1">Subject *</label>
                    <input
                      id="contact-subject"
                      type="text"
                      className="form-input"
                      placeholder="e.g. New solar irrigation project in Dokolo"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-semibold text-gray-600 mb-1">Details / Message *</label>
                    <textarea
                      id="contact-message"
                      className="form-input"
                      rows={5}
                      placeholder="Describe the project, technology, or organisation you are submitting. Include key details such as location, implementing partners, status, and any links to documentation..."
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className="w-full py-3 bg-primary-700 text-white font-bold rounded-xl hover:bg-primary-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {state === "loading" ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      "Submit Information"
                    )}
                  </button>
                </form>
              </div>

              {/* Contact info */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card">
                  <h3 className="font-bold text-gray-900 mb-4">Direct Contact</h3>
                  <div className="space-y-3 text-sm">
                    {[
                      { icon: "📧", label: "Email", value: "info@agrienergy.nrep.ug", href: "mailto:info@agrienergy.nrep.ug" },
                      { icon: "📞", label: "Phone", value: "+256 393 100 495" },
                      { icon: "🏢", label: "Address", value: "NREP Secretariat, Amber House, Kampala, Uganda" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <span className="text-lg shrink-0">{item.icon}</span>
                        <div>
                          <div className="font-semibold text-gray-600 text-xs uppercase tracking-wide">{item.label}</div>
                          {item.href ? (
                            <a href={item.href} className="text-primary-700 hover:underline">{item.value}</a>
                          ) : (
                            <span className="text-gray-700">{item.value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card">
                  <h3 className="font-bold text-gray-900 mb-4">What We Accept</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {[
                      "Agri-energy project information and status updates",
                      "Technology profiles and performance data",
                      "Partner organisation details",
                      "Reports, case studies, and policy documents",
                      "Questions about platform use or data",
                      "Requests for bulk data or API access",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-primary-600 mt-0.5 shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                  <div className="text-emerald-700 font-semibold text-sm mb-1">📬 Submissions are tracked</div>
                  <p className="text-emerald-600 text-xs leading-relaxed">
                    Every submission is stored securely and visible to the Agri-Energy Desk team in the Admin Portal, where your enquiry can be reviewed and responded to.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
