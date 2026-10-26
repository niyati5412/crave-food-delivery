import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  LifeBuoy,
  MessageSquare,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Ticket,
  ShieldCheck,
  RefreshCw,
  FileText
} from 'lucide-react';

const FAQS = [
  {
    category: 'Ordering & Menu',
    q: 'How do I know if a restaurant delivers to my address?',
    a: 'Each restaurant on CRAVE has an authoritative service area verified by postal PIN codes and geospatial delivery radii. You can verify serviceability on any dish or restaurant page by checking your address bar.'
  },
  {
    category: 'Ordering & Menu',
    q: 'Can I order from multiple restaurants in a single cart?',
    a: 'To guarantee food arrives fresh and at optimal thermal temperature, each order is prepared and dispatched by a single artisanal kitchen. Adding items from another kitchen will prompt you to replace or complete your current cart.'
  },
  {
    category: 'Payment & Billing',
    q: 'What payment methods does CRAVE accept?',
    a: 'We accept Cash on Delivery (COD) and Online Payments (Cards, NetBanking, UPI). Online payments are cryptographically verified before any order is marked as paid.'
  },
  {
    category: 'Payment & Billing',
    q: 'When are refunds processed if an order is cancelled?',
    a: 'If a payment was completed and the kitchen rejects the order or an authorized cancellation occurs, refunds are credited back to the original source within 3–5 banking days.'
  },
  {
    category: 'Delivery & Live Tracking',
    q: 'How does live GPS order tracking work?',
    a: 'Once the kitchen finishes handcrafting your order and hands it to the fleet courier, the live map displays real-time GPS coordinates and route telemetry until safe doorstep arrival.'
  },
  {
    category: 'Delivery & Live Tracking',
    q: 'What is the 4-digit Delivery OTP on my order page?',
    a: 'The Delivery OTP ensures that food is handed over exclusively to you. Share this code with the delivery partner upon arrival to complete the safe delivery confirmation.'
  },
  {
    category: 'Cancellations & Adjustments',
    q: 'Can I cancel an order once placed?',
    a: 'Orders can be cancelled before the restaurant accepts and begins preparing your items. Once the culinary team confirms and starts cooking, cancellations require administrative support assistance.'
  }
];

export default function CustomerCarePage() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('faqs'); // 'faqs' | 'new_ticket' | 'my_tickets'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // New Ticket Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('order_issue');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState('');
  const [ticketError, setTicketError] = useState('');

  // Ticket History State
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'my_tickets') {
      fetchMyTickets();
    }
  }, [isAuthenticated, activeTab]);

  const fetchMyTickets = async () => {
    try {
      setLoadingTickets(true);
      const res = await api.get('/support');
      if (res.data.success) {
        setMyTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.warn('Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setTicketError('');
    setTicketSuccess('');

    if (!subject.trim() || !message.trim()) {
      setTicketError('Please provide both a subject and details of your request.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/support', {
        subject: subject.trim(),
        category,
        orderId: orderId.trim() || undefined,
        message: message.trim()
      });

      if (res.data.success) {
        setTicketSuccess('Support ticket created successfully! Our team will inspect and respond.');
        setSubject('');
        setOrderId('');
        setMessage('');
        setActiveTab('my_tickets');
        fetchMyTickets();
      }
    } catch (err) {
      setTicketError(err.response?.data?.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest flex items-center gap-1.5">
            <LifeBuoy className="w-4 h-4" />
            CRAVE Concierge & Support
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mt-1">
            Customer Care Center
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Browse answers to common questions or submit a ticket directly to our operational support desk.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1.5 bg-ivory-200 rounded-2xl border border-ivory-300 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('faqs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'faqs'
                ? 'bg-charcoal-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-charcoal-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new_ticket')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'new_ticket'
                ? 'bg-charcoal-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-charcoal-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Contact Support</span>
          </button>

          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setActiveTab('my_tickets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'my_tickets'
                  ? 'bg-charcoal-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-charcoal-900'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>My Tickets</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Frequently Asked Questions */}
      {activeTab === 'faqs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-charcoal-900">
              Frequently Answered Inquiries
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('new_ticket')}
              className="text-xs font-bold text-citrus-600 hover:underline"
            >
              Need more help? Open a Ticket →
            </button>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-citrus-600 uppercase tracking-widest block mb-0.5">
                        {faq.category}
                      </span>
                      <h3 className="text-sm font-bold text-charcoal-900">
                        {faq.q}
                      </h3>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-ivory-100 flex items-center justify-center text-stone-500 flex-shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-stone-600 leading-relaxed border-t border-stone-100 bg-ivory-50/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Contact Support Form */}
      {activeTab === 'new_ticket' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-charcoal-900">
                Submit a Support Ticket
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Our operations team tracks and answers all inquiries with audit trail logging.
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="p-6 bg-ivory-100 rounded-2xl border border-ivory-300 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-citrus-600 mx-auto" />
                <h3 className="font-serif text-base font-bold text-charcoal-900">
                  Authentication Required
                </h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto">
                  Please sign in to submit and track support tickets linked to your verified account.
                </p>
                <Link
                  to="/login"
                  className="inline-block px-5 py-2.5 rounded-full bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs shadow-sm transition-all"
                >
                  Sign In to Continue
                </Link>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                {ticketError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{ticketError}</span>
                  </div>
                )}

                {ticketSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>{ticketSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Subject / Summary *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Question regarding delivery address update"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                    >
                      <option value="order_issue">Order Quality or Items</option>
                      <option value="payment">Payment & Transactions</option>
                      <option value="refund">Refund Request</option>
                      <option value="delivery">Delivery & Tracking</option>
                      <option value="account">Account & Addresses</option>
                      <option value="restaurant">Kitchen / Restaurant</option>
                      <option value="other">General Inquiries</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Order ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="e.g. CRV-184056-532"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Detailed Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your query so our operations team can resolve it efficiently..."
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <span>Submitting Ticket...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Support Ticket</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Info Box */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-ivory-100 rounded-3xl p-6 border border-ivory-300 space-y-4">
              <span className="text-[10px] font-bold text-citrus-600 uppercase tracking-widest block">
                Support Protocol
              </span>
              <h3 className="font-serif text-lg font-bold text-charcoal-900">
                Verified Concierge Guarantee
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Tickets submitted through this portal are saved to our MongoDB audit collection and routed directly to CRAVE platform administrators.
              </p>
              <div className="pt-2 space-y-2 text-xs text-charcoal-800 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Authenticated account ownership</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-citrus-600" />
                  <span>Response resolution within 24 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Persistent audit trail & status updates</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: My Support Tickets */}
      {activeTab === 'my_tickets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-charcoal-900">
                Your Support Tickets
              </h2>
              <p className="text-xs text-stone-500">
                Track status and resolutions provided by CRAVE administrators.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchMyTickets}
              className="p-2.5 rounded-xl bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-charcoal-900 transition-colors"
              title="Refresh tickets"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingTickets ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((n) => (
                <div key={n} className="h-28 bg-stone-200 rounded-2xl" />
              ))}
            </div>
          ) : myTickets.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
              <Ticket className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-charcoal-900">
                No Tickets Found
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                You haven't opened any support tickets yet. If you ever need help, use the contact form above.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('new_ticket')}
                className="mt-2 px-5 py-2.5 rounded-full bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs shadow-sm transition-all inline-block"
              >
                Create First Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myTickets.map((t) => {
                const statusStyles = {
                  open: 'bg-amber-100 text-amber-800 border-amber-200',
                  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
                  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  closed: 'bg-stone-100 text-stone-700 border-stone-200'
                };

                return (
                  <div
                    key={t._id}
                    className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                          Category: {t.category?.replace('_', ' ')} {t.orderId ? `• Order: #${t.orderId}` : ''}
                        </span>
                        <h4 className="text-sm font-bold text-charcoal-900 mt-0.5">
                          {t.subject}
                        </h4>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyles[t.status] || 'bg-stone-100 text-stone-800'}`}>
                        {t.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">
                      {t.message}
                    </p>

                    {t.adminNotes && (
                      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-900 block flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Admin Resolution Note:
                        </span>
                        <p className="text-emerald-800 text-[11px] leading-relaxed">
                          {t.adminNotes}
                        </p>
                      </div>
                    )}

                    <div className="text-[10px] text-stone-400 pt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Submitted on {new Date(t.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
