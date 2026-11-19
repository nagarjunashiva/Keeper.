import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Phone,
  ExternalLink,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Building,
  Calendar,
  Tag
} from 'lucide-react';
import { ComputedPurchase, ReceiptRecord } from '../App';

interface WarrantyClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: ComputedPurchase | null;
  receipt?: ReceiptRecord;
  onPreviewReceipt?: (receipt: ReceiptRecord) => void;
  onEditPurchase?: (purchase: ComputedPurchase) => void;
  currencySymbol: string;
}

// Brand Customer Care Directory (India & Global Helplines)
const BRAND_DIRECTORIES: Record<
  string,
  { phone: string; portal: string; hours: string; serviceType: string }
> = {
  apple: {
    phone: '000800 1009009 / 1800 108 7999',
    portal: 'https://support.apple.com/en-in',
    hours: 'Mon-Sun 09:00 - 21:00 IST',
    serviceType: 'Apple Authorized Service Provider (AASP) / Genius Bar'
  },
  samsung: {
    phone: '1800 40 7267864 / 1800 5 7267864',
    portal: 'https://www.samsung.com/in/support/',
    hours: '24x7 Toll Free Support',
    serviceType: 'Samsung Smart Plaza & Service Center'
  },
  sony: {
    phone: '1800 103 7799',
    portal: 'https://www.sony.co.in/electronics/support',
    hours: 'Mon-Sun 09:00 - 19:30 IST',
    serviceType: 'Sony Authorized Service Center'
  },
  oneplus: {
    phone: '1800 102 8411',
    portal: 'https://www.oneplus.in/support',
    hours: 'Mon-Sun 09:00 - 21:00 IST',
    serviceType: 'OnePlus Exclusive Service Center'
  },
  dell: {
    phone: '1800 425 0088 / 1800 425 2067',
    portal: 'https://www.dell.com/support/home/en-in',
    hours: 'Mon-Fri 09:00 - 18:00 IST',
    serviceType: 'Dell Onsite Warranty Service & Repair'
  },
  hp: {
    phone: '1800 258 7170',
    portal: 'https://support.hp.com/in-en',
    hours: 'Mon-Sat 09:00 - 19:00 IST',
    serviceType: 'HP Customer Care & Authorized Repair'
  },
  lenovo: {
    phone: '1800 419 7555',
    portal: 'https://support.lenovo.com/in/en/',
    hours: 'Mon-Sat 09:00 - 18:00 IST',
    serviceType: 'Lenovo Service Center / Premier Support'
  },
  dyson: {
    phone: '1800 258 6688',
    portal: 'https://www.dyson.in/support',
    hours: 'Mon-Sun 09:00 - 19:00 IST',
    serviceType: 'Dyson Direct Doorstep Technician'
  },
  jbl: {
    phone: '1800 102 0525',
    portal: 'https://in.jbl.com/support-contact.html',
    hours: 'Mon-Sat 10:00 - 18:00 IST',
    serviceType: 'Harman / JBL Authorized Care'
  },
  amazon: {
    phone: '1800 3000 9009',
    portal: 'https://www.amazon.in/gp/help/customer/display.html',
    hours: '24x7 Customer Service',
    serviceType: 'Amazon Customer Support & Device Returns'
  },
  croma: {
    phone: '1800 572 7662',
    portal: 'https://www.croma.com/help-and-support',
    hours: '10:00 - 20:00 IST',
    serviceType: 'Croma ZipCare Warranty Service'
  },
  reliance: {
    phone: '1800 889 1055',
    portal: 'https://www.reliancedigital.in/help',
    hours: '09:30 - 19:30 IST',
    serviceType: 'resQ Electronics Care'
  }
};

export function WarrantyClaimModal({
  isOpen,
  onClose,
  purchase,
  receipt,
  onPreviewReceipt,
  onEditPurchase,
  currencySymbol
}: WarrantyClaimModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !purchase) return null;

  const brandKey = purchase.brand.toLowerCase().trim();
  const matchedBrand = Object.keys(BRAND_DIRECTORIES).find((k) => brandKey.includes(k));
  const brandInfo = matchedBrand
    ? BRAND_DIRECTORIES[matchedBrand]
    : {
        phone: 'Check packaging box or store invoice for toll-free number',
        portal: `https://www.google.com/search?q=${encodeURIComponent(purchase.brand + ' warranty customer care India')}`,
        hours: 'Business working hours',
        serviceType: `${purchase.brand} Official Authorized Service Center`
      };

  const claimDossier = `=========================================
KEEPER™ OFFICIAL WARRANTY CLAIM DOSSIER
=========================================
Product Name:     ${purchase.productName}
Brand / OEM:      ${purchase.brand}
Category:         ${purchase.category}
Purchase Price:   ${currencySymbol}${purchase.price.toLocaleString('en-IN')}
Purchase Date:    ${purchase.purchaseDate}
Merchant / Store: ${purchase.store || 'Authorized Retailer'}
Serial / IMEI:    ${purchase.serialNumber || 'NOT RECORDED'}
Invoice Number:   ${receipt?.invoiceNumber || 'No receipt attached'}
Warranty Status:  ${purchase.warrantyDisplayLabel}
Warranty Expiry:  ${purchase.warrantyExpiryDate || 'No Date'}
Remaining Days:   ${purchase.remainingWarrantyDays ?? 'N/A'}
Notes / Remarks:  ${purchase.notes || 'None'}
=========================================`;

  const handleCopyDossier = async () => {
    try {
      await navigator.clipboard.writeText(claimDossier);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const hasSerial = Boolean(purchase.serialNumber && purchase.serialNumber.trim());
  const hasReceipt = Boolean(receipt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141518] border border-[#292A2F] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#25262B] flex items-center justify-between shrink-0 bg-[#18191E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#172D20] border border-[#234F36] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#5CE095]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#F5F3EF]">
                  Warranty Claim & Support Dossier
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    purchase.warrantyStatus === 'Active'
                      ? 'bg-[#173023] text-[#5CE095] border border-[#224934]'
                      : purchase.warrantyStatus === 'Expiring Soon'
                      ? 'bg-[#362816] text-[#F2B354] border border-[#4F391E]'
                      : 'bg-[#341B1E] text-[#F27474] border border-[#4D262A]'
                  }`}
                >
                  {purchase.warrantyDisplayLabel}
                </span>
              </div>
              <p className="text-xs text-[#A5A5A5] mt-0.5">
                Official helpline contacts, instant dossier clipboard, and proof verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#25262B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
          {/* Product Overview Card */}
          <div className="p-4 rounded-xl bg-[#191A1E] border border-[#292A2F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={purchase.imageUrl}
                alt={purchase.productName}
                className="w-16 h-14 rounded-xl object-cover border border-[#2D2E35] shrink-0"
              />
              <div>
                <h3 className="text-base font-semibold text-[#F5F3EF]">{purchase.productName}</h3>
                <div className="text-xs text-[#A5A5A5] mt-0.5">
                  {purchase.brand} • Purchased {purchase.purchaseDate} at {purchase.store || 'Store'}
                </div>
                <div className="text-xs text-[#F2BD91] font-medium mt-1">
                  Valued at {currencySymbol}{purchase.price.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <div className="text-[11px] text-[#A5A5A5]">Coverage Horizon</div>
              <div className="text-sm font-semibold text-[#F5F3EF] mt-0.5">
                {purchase.warrantyExpiryDate || 'No date'}
              </div>
              <div className="text-[11px] text-[#5CE095] font-medium mt-0.5">
                {purchase.remainingWarrantyDays !== null && purchase.remainingWarrantyDays >= 0
                  ? `${purchase.remainingWarrantyDays} Days Remaining`
                  : 'Coverage Expired'}
              </div>
            </div>
          </div>

          {/* Claim Readiness Checklist */}
          <div className="p-4 rounded-xl bg-[#191A1E] border border-[#292A2F] space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#F2BD91]">
              Claim Readiness Checklist
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Receipt Status */}
              <div className="p-3 rounded-lg bg-[#141518] border border-[#24252B] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {hasReceipt ? (
                    <div className="w-6 h-6 rounded-full bg-[#173023] text-[#5CE095] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#362816] text-[#F2B354] flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-[#F5F3EF]">
                      {hasReceipt ? 'Proof of Purchase Attached' : 'Missing Invoice Proof'}
                    </div>
                    <div className="text-[11px] text-[#A5A5A5]">
                      {receipt ? `#${receipt.invoiceNumber} (${receipt.fileName})` : 'Upload receipt to claim easily'}
                    </div>
                  </div>
                </div>
                {hasReceipt && onPreviewReceipt && (
                  <button
                    type="button"
                    onClick={() => onPreviewReceipt(receipt!)}
                    className="text-[11px] px-2.5 py-1 rounded bg-[#25262C] text-[#F2BD91] hover:bg-[#2F3038] font-medium"
                  >
                    View
                  </button>
                )}
              </div>

              {/* Serial Number Status */}
              <div className="p-3 rounded-lg bg-[#141518] border border-[#24252B] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {hasSerial ? (
                    <div className="w-6 h-6 rounded-full bg-[#173023] text-[#5CE095] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#362816] text-[#F2B354] flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-[#F5F3EF]">
                      {hasSerial ? 'Serial Number Documented' : 'Missing Serial / IMEI'}
                    </div>
                    <div className="text-[11px] text-[#A5A5A5] font-mono">
                      {hasSerial ? purchase.serialNumber : 'Add for faster OEM support'}
                    </div>
                  </div>
                </div>
                {!hasSerial && onEditPurchase && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditPurchase(purchase);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded bg-[#25262C] text-[#F2BD91] hover:bg-[#2F3038] font-medium"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Official Brand Contact Directory */}
          <div className="p-4 rounded-xl bg-[#191A1E] border border-[#292A2F] space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#F2BD91]">
                Official Brand Support Directory: {purchase.brand}
              </div>
              <span className="text-[11px] text-[#5CE095] bg-[#173023] px-2 py-0.5 rounded border border-[#224934]">
                Verified Helpdesk
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#141518] border border-[#24252B]">
                <div className="text-[#A5A5A5] flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5 text-[#F2BD91]" />
                  <span>Customer Support Helpline</span>
                </div>
                <div className="font-semibold text-[#F5F3EF] text-sm tracking-wide">
                  {brandInfo.phone}
                </div>
                <div className="text-[11px] text-[#7A7C85] mt-1">{brandInfo.hours}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#141518] border border-[#24252B] flex flex-col justify-between">
                <div>
                  <div className="text-[#A5A5A5] flex items-center gap-1.5 mb-1">
                    <ExternalLink className="w-3.5 h-3.5 text-[#5CE095]" />
                    <span>Official Online Support Portal</span>
                  </div>
                  <div className="text-[11px] text-[#A5A5A5]">{brandInfo.serviceType}</div>
                </div>
                <a
                  href={brandInfo.portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-xs font-semibold text-[#F2BD91] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open {purchase.brand} Support Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Formatted Claim Dossier */}
          <div className="p-4 rounded-xl bg-[#191A1E] border border-[#292A2F] space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[#F5F3EF]">
                One-Click Claim Dossier (Ready for email or support tickets)
              </div>
              <button
                type="button"
                onClick={handleCopyDossier}
                className="px-3 py-1.5 rounded-lg bg-[#25262C] hover:bg-[#303138] text-[#F5F3EF] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#5CE095]" />
                    <span className="text-[#5CE095]">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#F2BD91]" />
                    <span>Copy Claim Dossier</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-[#111215] border border-[#222328] font-mono text-[11px] text-[#C5C5CB] overflow-x-auto whitespace-pre leading-relaxed">
              {claimDossier}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#25262B] flex items-center justify-end gap-3 shrink-0 bg-[#18191E]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#25262C] hover:bg-[#303138] text-[#F5F3EF] text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
