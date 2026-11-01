import React from 'react';
import { ExternalLink, ArrowUp, Mail, Phone, MapPin, Globe, Share2, Facebook, Linkedin, Youtube, Headset } from 'lucide-react';
import { NavTabId, NAV_ITEMS } from './PortalHeader';
import { useLms } from '../context/LmsContext';

const supportMailto = (email: string) => `mailto:${email}?subject=${encodeURIComponent('KBZLife LMS Support')}`;

const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.38-2.48V9.66a5.73 5.73 0 0 0-.79-.05A5.68 5.68 0 0 0 4.17 15.3 5.68 5.68 0 0 0 9.86 21a5.68 5.68 0 0 0 5.68-5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48Z" />
  </svg>
);

const SOCIAL_LINKS: { name: string; href: string; Icon: React.FC<{ className?: string }> }[] = [
  { name: 'Facebook', href: 'https://www.facebook.com/kbzlife/', Icon: Facebook },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/kbz-life-insurance-co-ltd/', Icon: Linkedin },
  { name: 'TikTok', href: 'https://www.tiktok.com/@kbz.life.insurance', Icon: TikTokIcon },
  { name: 'YouTube', href: 'https://www.youtube.com/@KBZLIFE', Icon: Youtube },
];

interface PortalFooterProps {
  onSelectTab: (tabId: NavTabId) => void;
  activeTab: NavTabId;
}

export const PortalFooter: React.FC<PortalFooterProps> = ({ onSelectTab, activeTab }) => {
  // LMS help desk contact, set in Admin → Settings
  const { appSettings } = useLms();
  const LMS_SUPPORT_EMAIL = appSettings.support_email;
  const LMS_SUPPORT_MAILTO = supportMailto(LMS_SUPPORT_EMAIL);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#176B98] text-white border-t border-[#135A80] mt-20" role="contentinfo">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Column 1: Brand & Overview (4 cols) */}
          <div className="md:col-span-4 space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl p-2 shadow-xs shrink-0 flex items-center justify-center">
                <img
                  src="/assets/aistudio/KBZ_Logo_28e9d8fb.png"
                  alt="KBZ LIFE Insurance"
                  className="h-9 sm:h-10 w-auto object-contain"
                />
              </div>
              <div className="flex flex-col border-l border-white/20 pl-3">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                  KBZ LIFE Insurance
                </span>
                <span className="text-[10px] sm:text-[11px] text-white/80 tracking-wider uppercase font-semibold mt-0.5">
                  Employee Learning Portal
                </span>
              </div>
            </div>

            <div className="pt-1">
              <span className="inline-block px-3 py-1 rounded-md bg-white/10 text-xs font-mono text-white/90 border border-white/15">
                The Right Insurance For You
              </span>
            </div>

            {/* Social Links */}
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/90 mb-2 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                <span>Social Links</span>
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {SOCIAL_LINKS.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`KBZ LIFE on ${name} (opens in a new tab)`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/10 text-white/90 border border-white/15 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links (Mandated strictly in footer only) (3 cols) */}
          <div className="md:col-span-3 space-y-4 text-left">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 pb-1 border-b border-white/15">
              Quick Links
            </h3>
            <ul className="space-y-3 text-sm" aria-label="Portal Quick Links">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onSelectTab(item.id);
                        scrollToTop();
                      }}
                      className={`group flex items-center gap-2 transition-colors cursor-pointer text-left ${
                        isActive
                          ? 'text-white font-bold underline underline-offset-4 decoration-white'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white opacity-60 group-hover:opacity-100 transition-opacity" />
                      <span>{item.label}</span>
                      {!item.isReady && (
                        <span className="text-[10px] bg-white/15 text-white/80 px-1.5 py-0.2 rounded font-normal">
                          Coming soon
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              <li>
                <a
                  href={LMS_SUPPORT_MAILTO}
                  className="group flex items-center gap-2 transition-colors text-white/80 hover:text-white"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white opacity-60 group-hover:opacity-100 transition-opacity" />
                  <span>Contact Us</span>
                </a>
              </li>
            </ul>

            <div className="pt-4">
              <a
                href="https://kbzlife.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-white/90 hover:text-white transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website : kbzlife.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Column 3: Contact Information (5 cols) */}
          <div className="md:col-span-5 space-y-4 text-left">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 pb-1 border-b border-white/15">
              Contact Information
            </h3>

            {/* LMS help desk */}
            <a
              id="contact-us"
              href={LMS_SUPPORT_MAILTO}
              className="flex items-start gap-3 bg-white text-slate-900 p-3.5 rounded-xl shadow-xs hover:bg-sky-50 transition-colors group"
            >
              <span className="w-9 h-9 rounded-lg bg-[#176B98] text-white flex items-center justify-center shrink-0">
                <Headset className="w-4.5 h-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-[#176B98] uppercase tracking-wider">Contact Us · LMS Support</span>
                <span className="block text-sm font-bold break-all group-hover:underline">{LMS_SUPPORT_EMAIL}</span>
                {appSettings.support_phone && (
                  <span className="block text-xs font-semibold text-slate-700 mt-0.5">{appSettings.support_phone}</span>
                )}
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Sign-in problems, course access or technical issues with the learning portal.
                </span>
              </span>
            </a>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2 bg-white/10 p-3 rounded-lg border border-white/15">
                <Mail className="w-4 h-4 text-white/90 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Email</span>
                  <a href="mailto:info@kbzlife.com" className="text-white/80 hover:text-white">
                    info@kbzlife.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-white/10 p-3 rounded-lg border border-white/15">
                <Phone className="w-4 h-4 text-white/90 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Call Us</span>
                  <a href="tel:+959954477788" className="text-white/80 hover:text-white">
                    (+95) 9954477788
                  </a>
                </div>
              </div>
            </div>

            {/* Branch Addresses */}
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-white/90 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Yangon Head Office:</span>
                  <p className="text-white/80 leading-relaxed mt-0.5">
                    No.C520/A-5, Pyae Wa Condominium, Kabar Aye Pagoda Road, Bahan Township, Yangon.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-white/90 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Mandalay Branch:</span>
                  <p className="text-white/80 leading-relaxed mt-0.5">
                    No.A(5+6), 33 Street , Between (77*78) Street, Chanayethazan Township, Mandalay.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-white/90 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Taunggyi Branch:</span>
                  <p className="text-white/80 leading-relaxed mt-0.5">
                    Room A - 10, Shop House Unit A, Small Highway Station, Taunggyi-Hopong Road, Taunggyi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright and Standards */}
        <div className="mt-14 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70">
          <div>
            © {new Date().getFullYear()} KBZ LIFE Insurance. All rights reserved. The Right Insurance For You.
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back to Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
