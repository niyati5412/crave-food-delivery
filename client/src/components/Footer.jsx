import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Compass, ShieldCheck, Heart, Github, Award } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-charcoal-950 text-stone-300 pt-16 pb-12 border-t border-charcoal-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-stone-800">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-aubergine-800 flex items-center justify-center text-white shadow-md">
                <Flame className="w-6 h-6 text-citrus-500" />
              </div>
              <span className="font-serif text-3xl font-bold text-white tracking-tight">
                CRAVE
              </span>
            </div>
            <p className="text-sm text-stone-400 max-w-sm leading-relaxed">
              Curated three-sided culinary marketplace connecting discerning diners with Michelin-starred kitchens, heritage bistros, and real-time tracked delivery partners.
            </p>
            <div className="flex items-center gap-2 text-xs text-citrus-400 font-semibold uppercase tracking-wider">
              <Award className="w-4 h-4" />
              Evaluation Benchmark Project 14
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-4">
              Explore Haute Cuisine
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>
                <Link to="/restaurants" className="hover:text-white transition-colors">
                  Artisanal Kitchens
                </Link>
              </li>
              <li>
                <Link to="/offers" className="hover:text-white transition-colors">
                  Gourmet Offers & Promos
                </Link>
              </li>
              <li>
                <Link to="/tracking" className="hover:text-white transition-colors">
                  Live Telemetry Tracker
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-white transition-colors">
                  Order Archives
                </Link>
              </li>
            </ul>
          </div>

          {/* Role Portals */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-4">
              Platform Portals
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>
                <Link to="/restaurant-dashboard" className="hover:text-white transition-colors">
                  Restaurant Kitchen Console
                </Link>
              </li>
              <li>
                <Link to="/partner-dashboard" className="hover:text-white transition-colors">
                  Courier Delivery Portal
                </Link>
              </li>
              <li>
                <Link to="/admin-dashboard" className="hover:text-white transition-colors">
                  Platform Admin Suite
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Multi-Role Authentication
                </Link>
              </li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-4">
              Architecture & Tech
            </h4>
            <ul className="space-y-1.5 text-xs text-stone-400">
              <li>• MongoDB 2dsphere Geospatial</li>
              <li>• Node.js & Express REST API</li>
              <li>• React 18 & Vite & Tailwind</li>
              <li>• Socket.IO Role-Gated Rooms</li>
              <li>• Leaflet Live GPS Tracking</li>
              <li>• Atomic Concurrency Safety</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>
            © {new Date().getFullYear()} CRAVE Food Technologies Inc. Developed for Final Evaluation.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Engineered with <Heart className="w-3.5 h-3.5 text-citrus-500 fill-citrus-500" /> on MERN Stack
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
