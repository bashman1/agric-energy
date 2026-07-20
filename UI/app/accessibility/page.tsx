import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement — Agri-Energy Desk",
  description:
    "How the Agri-Energy Desk platform conforms to WCAG 2.1 Level AA, the measures we take, known limitations, and how to report a barrier.",
};

const MEASURES = [
  {
    title: "Semantic structure",
    body: "Every page uses landmark regions (header, main, navigation, footer) and a single, logically ordered heading hierarchy, so screen-reader users can navigate by heading or region.",
  },
  {
    title: "Keyboard operability",
    body: "All interactive controls — navigation, filters, search, the project map controls and the image gallery lightbox — are reachable and operable with a keyboard alone. Dialogs trap focus while open and return focus to the element that opened them.",
  },
  {
    title: "Visible focus",
    body: "A clear focus indicator is shown on every focusable element, and a skip-to-content link is the first item in the tab order on each page.",
  },
  {
    title: "Text alternatives",
    body: "Images carry descriptive alt text; decorative icons are hidden from assistive technology. Data tables have captions and scoped row and column headers.",
  },
  {
    title: "Forms and status messages",
    body: "All inputs have persistent, programmatically associated labels; required fields are marked in text as well as visually. Success and error messages are announced through live regions rather than colour alone.",
  },
  {
    title: "Colour and contrast",
    body: "Text and essential interface elements meet the WCAG 2.1 AA contrast minimums (4.5:1 for body text, 3:1 for large text and interface components). Colour is never the only means of conveying information.",
  },
  {
    title: "Responsive and zoomable",
    body: "Layouts reflow to 320px width and support 200% text zoom without loss of content or functionality. Content is not restricted to a single screen orientation.",
  },
  {
    title: "Automated and manual testing",
    body: "The codebase is linted with eslint-plugin-jsx-a11y, and pages are checked manually with keyboard-only navigation and a screen reader before release.",
  },
];

const LIMITATIONS = [
  {
    title: "Interactive project map",
    body: "The map at /map relies on a third-party mapping library. A keyboard-accessible list and filter view of the same projects is provided at /projects, and the underlying data can be downloaded in full from the open-data hub.",
  },
  {
    title: "Uploaded documents",
    body: "Reports, policy briefs and other PDFs in the resources library are supplied by partner organisations. Some older documents are scanned images without a text layer and are therefore not readable by screen readers. We ask contributors for accessible originals and will supply an alternative format on request.",
  },
  {
    title: "Partner-supplied images",
    body: "Alt text on partner-contributed photography is added during editorial review. Where a description is still generic, we are working through the backlog.",
  },
  {
    title: "Embedded third-party content",
    body: "Registration forms and videos hosted by external providers are outside our control and may not meet the same standard. We flag these and provide a direct contact route as an alternative.",
  },
];

export default function AccessibilityPage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-primary-300 text-sm font-semibold mb-2 uppercase tracking-wider">
              Accessibility
            </div>
            <h1 className="text-3xl font-extrabold mb-3">
              Accessibility statement
            </h1>
            <p className="text-primary-100">
              The Agri-Energy Desk is committed to making this platform usable by
              everyone, including people who rely on assistive technology.
            </p>
          </div>
        </section>

        <section className="bg-white py-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
            {/* ── Conformance ──────────────────────────────── */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Conformance status
              </h2>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4">
                <p className="text-sm text-emerald-800 leading-relaxed">
                  <strong>
                    This platform aims to conform to the Web Content
                    Accessibility Guidelines (WCAG) 2.1 at Level AA.
                  </strong>{" "}
                  We assess the site as <strong>partially conformant</strong>:
                  most of the platform meets Level AA, with the exceptions listed
                  under known limitations below.
                </p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                &ldquo;Partially conformant&rdquo; means that some parts of the
                content do not yet fully meet the standard. WCAG 2.1 is published
                by the World Wide Web Consortium (W3C) and defines requirements
                for making web content more accessible to people with visual,
                auditory, physical, speech, cognitive, language and neurological
                disabilities.
              </p>
            </div>

            {/* ── Measures ─────────────────────────────────── */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Measures we take
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Accessibility is considered when features are designed, built and
                reviewed — not retrofitted. Specifically:
              </p>
              <ul className="space-y-4 list-none p-0 m-0">
                {MEASURES.map((m) => (
                  <li
                    key={m.title}
                    className="bg-gray-50 rounded-xl border border-gray-100 p-5"
                  >
                    <h3 className="font-bold text-gray-900 text-sm mb-1">
                      {m.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {m.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Known limitations ────────────────────────── */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Known limitations
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Despite our efforts, some content falls short of Level AA. We are
                aware of the following and are working to address them:
              </p>
              <ul className="space-y-4 list-none p-0 m-0">
                {LIMITATIONS.map((l) => (
                  <li
                    key={l.title}
                    className="border-l-4 border-amber-300 bg-amber-50 rounded-r-xl p-5"
                  >
                    <h3 className="font-bold text-amber-900 text-sm mb-1">
                      {l.title}
                    </h3>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      {l.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Compatibility ────────────────────────────── */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Compatibility
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                The platform is designed to work with current versions of Chrome,
                Firefox, Safari and Edge, used together with the screen readers
                built into those platforms (NVDA and Narrator on Windows,
                VoiceOver on macOS and iOS, TalkBack on Android). It does not
                depend on JavaScript for its core content: article, project,
                technology and resource pages are rendered on the server and
                remain readable if scripts fail to load.
              </p>
            </div>

            {/* ── Alternatives ─────────────────────────────── */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Alternative formats
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If a document or dataset on this site is not accessible to you,
                we will provide the information in another format. The full
                project register is also available as machine-readable CSV and
                GeoJSON from the{" "}
                <Link href="/data" className="text-primary-700 font-semibold hover:underline">
                  open data hub
                </Link>
                .
              </p>
            </div>

            {/* ── Feedback ─────────────────────────────────── */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Feedback and reporting a barrier
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                We welcome your feedback. If you encounter a barrier, please tell
                us what you were trying to do, the page address, and the browser
                and assistive technology you were using. We aim to respond within
                five business days.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center px-5 py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800 transition-colors text-sm"
              >
                Report an accessibility issue →
              </Link>
            </div>

            {/* ── Assessment ───────────────────────────────── */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-2">
                About this statement
              </h2>
              <dl className="text-sm text-gray-600 space-y-1">
                <div className="flex gap-2">
                  <dt className="font-semibold text-gray-700">Standard:</dt>
                  <dd>WCAG 2.1, Level AA</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold text-gray-700">Assessment approach:</dt>
                  <dd>
                    Self-evaluation, combining automated linting with manual
                    keyboard and screen-reader testing
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold text-gray-700">Applies to:</dt>
                  <dd>The public Agri-Energy Desk platform</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
