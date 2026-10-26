import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  Clock,
  MapPin,
  ChevronRight,
  ShoppingBag,
  CheckCircle,
  Radio,
  RotateCcw
} from 'lucide-react';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div>
        <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest">
          Personal Culinary Archive
        </span>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
          Your Past Orders
        </h1>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(n => <div key={n} className="h-44 bg-stone-200 rounded-3xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-stone-200 space-y-3">
          <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No Orders Yet
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            You haven't placed any culinary orders yet. Explore our curated artisanal restaurants to begin.
          </p>
          <div className="pt-2">
            <Link
              to="/restaurants"
              className="inline-block px-5 py-2.5 rounded-full bg-citrus-600 text-white font-bold text-xs"
            >
              Explore Restaurants
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isActive = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'].includes(order.status);

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Left: Restaurant & Items */}
                <div className="flex items-start gap-4">
                  <img
                    src={order.restaurantId?.images?.cover || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80'}
                    alt={order.restaurantId?.name}
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-charcoal-900">
                        {order.restaurantId?.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : isActive
                          ? 'bg-citrus-100 text-citrus-800 animate-pulse'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="font-mono text-xs text-stone-400">#{order.orderNumber}</p>

                    <p className="text-xs text-stone-600 line-clamp-1">
                      {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>

                    <p className="text-[11px] text-stone-400">
                      {new Date(order.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Action */}
                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-stone-100 gap-3">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-stone-400 block font-semibold">Total Paid</span>
                    <span className="font-serif text-lg font-bold text-charcoal-900">
                      ₹{order.amountBreakup?.totalAmount}
                    </span>
                  </div>

                  <Link
                    to={`/tracking/${order._id}`}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-citrus-600 hover:bg-citrus-500 text-white shadow-sm'
                        : 'bg-ivory-200 hover:bg-ivory-300 text-charcoal-900'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Track Live Telemetry</span>
                      </>
                    ) : (
                      <>
                        <span>View Order Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
