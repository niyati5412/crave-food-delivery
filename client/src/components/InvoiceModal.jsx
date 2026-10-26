import React from 'react';
import { X, Printer, Flame, CheckCircle, FileText } from 'lucide-react';

export default function InvoiceModal({ order, restaurant, deliveryAddress, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]">
        
        {/* Header Actions */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-charcoal-900">
            <FileText className="w-4 h-4 text-citrus-600" />
            Official Tax Invoice / Payment Receipt
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-charcoal-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-8 overflow-y-auto space-y-6 text-charcoal-900 text-xs">
          
          {/* Brand & Invoice Details */}
          <div className="flex items-start justify-between border-b border-stone-200 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-aubergine-900 flex items-center justify-center text-white">
                  <Flame className="w-5 h-5 text-citrus-500" />
                </div>
                <span className="font-serif text-2xl font-black tracking-tight">CRAVE</span>
              </div>
              <p className="text-[11px] text-stone-500">CRAVE Food Technologies Pvt. Ltd.</p>
              <p className="text-[10px] text-stone-400">GSTIN: 07AABCC1234F1Z8 • FSSAI Lic. 10020011000987</p>
            </div>

            <div className="text-right space-y-0.5">
              <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                {order.paymentStatus === 'paid' ? 'Paid / Settled' : 'Payment on Delivery'}
              </span>
              <p className="font-mono font-bold text-sm text-charcoal-900">#{order.orderNumber}</p>
              <p className="text-stone-500 text-[11px]">
                Date: {new Date(order.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Restaurant & Customer Address Columns */}
          <div className="grid grid-cols-2 gap-6 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Prepared By:</span>
              <p className="font-bold text-charcoal-900 text-sm">{restaurant?.name || 'Artisanal Kitchen'}</p>
              <p className="text-stone-600">{restaurant?.address?.addressLine}</p>
              <p className="text-stone-500">{restaurant?.address?.city} - {restaurant?.address?.pincode}</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Delivered To:</span>
              <p className="font-bold text-charcoal-900">{deliveryAddress?.addressLine}</p>
              <p className="text-stone-600">{deliveryAddress?.city} - {deliveryAddress?.pincode}</p>
              <p className="text-stone-500">Phone: {deliveryAddress?.contactPhone}</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-300 font-bold uppercase text-[10px] text-stone-500">
                  <th className="py-2.5">Item Description</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Unit Price</th>
                  <th className="py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {order.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5">
                      <p className="font-bold text-charcoal-900">{item.name}</p>
                      {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                        <p className="text-[10px] text-stone-400">
                          Add-ons: {item.selectedAddOns.map(a => `${a.name} (+₹${a.price})`).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 text-center font-semibold">{item.quantity}</td>
                    <td className="py-2.5 text-right">₹{item.price}</td>
                    <td className="py-2.5 text-right font-bold">₹{item.itemTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount Breakdown Summary */}
          <div className="border-t border-stone-200 pt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-stone-600">
              <div className="flex justify-between">
                <span>Food Subtotal:</span>
                <span className="font-bold text-charcoal-900">₹{order.amountBreakup?.itemSubtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Logistics:</span>
                <span>₹{order.amountBreakup?.deliveryFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Eco Thermal Packaging:</span>
                <span>₹{order.amountBreakup?.packagingFee}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5% SGST + CGST):</span>
                <span>₹{order.amountBreakup?.tax}</span>
              </div>
              {order.amountBreakup?.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Promotional Discount:</span>
                  <span>-₹{order.amountBreakup?.discount}</span>
                </div>
              )}
              <div className="border-t border-stone-300 pt-2 flex justify-between font-bold text-charcoal-900 text-sm">
                <span>Grand Total:</span>
                <span className="text-citrus-600 font-serif text-base">₹{order.amountBreakup?.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="pt-6 border-t border-stone-100 text-[10px] text-stone-400 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
            <p>Payment Mode: {order.paymentMode} • Delivery Verification OTP: {order.deliveryOtp}</p>
            <p>Computer Generated Tax Invoice. No signature required.</p>
          </div>

        </div>

      </div>
    </div>
  );
}
