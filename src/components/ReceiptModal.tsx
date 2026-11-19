import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  Store,
  Tag,
  IndianRupee,
  Calendar,
  Package,
  File,
  Check
} from 'lucide-react';
import { Purchase, ReceiptRecord } from '../App';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    purchaseId: string;
    fileName: string;
    fileType: 'application/pdf' | 'image/jpeg' | 'image/png';
    fileSizeBytes: number;
    uploadDate: string;
    invoiceNumber: string;
    title: string;
    store: string;
    amount: number;
    notes: string;
    categoryTag: string;
    file?: File;
  }) => Promise<void>;
  editingReceipt?: ReceiptRecord | null;
  pendingFile?: File | null;
  purchases: Purchase[];
  currencySymbol: string;
  defaultDate: string;
  initialPurchaseId?: string;
}

export function ReceiptModal({
  isOpen,
  onClose,
  onSave,
  editingReceipt,
  pendingFile,
  purchases,
  currencySymbol,
  defaultDate,
  initialPurchaseId
}: ReceiptModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(pendingFile || null);
  const [title, setTitle] = useState('');
  const [store, setStore] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [uploadDate, setUploadDate] = useState(defaultDate);
  const [purchaseId, setPurchaseId] = useState(initialPurchaseId || '');
  const [categoryTag, setCategoryTag] = useState('Electronics');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingReceipt) {
      setSelectedFile(null);
      setTitle(editingReceipt.title || editingReceipt.fileName.replace(/\.[^/.]+$/, ''));
      setStore(editingReceipt.store || '');
      setInvoiceNumber(editingReceipt.invoiceNumber || '');
      setAmount(editingReceipt.amount !== undefined && editingReceipt.amount > 0 ? editingReceipt.amount : '');
      setUploadDate(editingReceipt.uploadDate || defaultDate);
      setPurchaseId(editingReceipt.purchaseId || '');
      setCategoryTag(editingReceipt.categoryTag || 'Electronics');
      setNotes(editingReceipt.notes || '');
    } else {
      setSelectedFile(pendingFile || null);
      const assoc = purchases.find((p) => p.id === (initialPurchaseId || ''));
      const initialFileName = pendingFile?.name || '';
      const cleanName = initialFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      setTitle(assoc ? `${assoc.productName} Tax Invoice` : cleanName || 'Official Tax Invoice');
      setStore(assoc?.store || '');
      setInvoiceNumber(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
      setAmount(assoc?.price || '');
      setUploadDate(defaultDate);
      setPurchaseId(initialPurchaseId || (purchases[0]?.id ?? ''));
      setCategoryTag(assoc?.category || 'Electronics');
      setNotes('');
    }
  }, [isOpen, editingReceipt, pendingFile, initialPurchaseId, purchases, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fileName = selectedFile
        ? selectedFile.name
        : editingReceipt
        ? editingReceipt.fileName
        : 'Invoice_Document.pdf';

      const fileType: 'application/pdf' | 'image/jpeg' | 'image/png' = selectedFile
        ? (selectedFile.type as 'application/pdf' | 'image/jpeg' | 'image/png') ||
          (selectedFile.name.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf')
        : editingReceipt?.fileType || 'application/pdf';

      const fileSizeBytes = selectedFile ? selectedFile.size : editingReceipt?.fileSizeBytes || 145000;

      await onSave({
        id: editingReceipt?.id,
        purchaseId,
        fileName,
        fileType,
        fileSizeBytes,
        uploadDate,
        invoiceNumber: invoiceNumber.trim() || `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        title: title.trim() || fileName,
        store: store.trim(),
        amount: typeof amount === 'number' ? amount : 0,
        notes: notes.trim(),
        categoryTag: categoryTag.trim(),
        file: selectedFile || undefined
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isPdf = selectedFile
    ? selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')
    : editingReceipt?.fileType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141518] border border-[#292A2F] rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#25262B] flex items-center justify-between shrink-0 bg-[#18191E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25201C] border border-[#3E3127] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#F2BD91]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F5F3EF]">
                {editingReceipt ? 'Edit Receipt & Invoice Details' : 'Upload Receipt & Invoice Details'}
              </h2>
              <p className="text-xs text-[#A5A5A5] mt-0.5">
                Attach proof of purchase, itemized text notes, invoice amount, and retailer data.
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* File Status / Selector */}
          <div className="p-3.5 rounded-xl bg-[#191A1E] border border-[#292A2F] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#222329] border border-[#30313A] flex items-center justify-center shrink-0">
                {isPdf ? (
                  <FileText className="w-4 h-4 text-[#F2BD91]" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-[#63C795]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-[#F5F3EF] truncate">
                  {selectedFile ? selectedFile.name : editingReceipt ? editingReceipt.fileName : 'No file selected'}
                </div>
                <div className="text-[11px] text-[#A5A5A5] mt-0.5">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready to save`
                    : editingReceipt
                    ? `${Math.round((editingReceipt.fileSizeBytes || 0) / 1024)} KB in secure vault`
                    : 'Select a PDF invoice or photo receipt'}
                </div>
              </div>
            </div>

            <label className="px-3 py-1.5 rounded-lg bg-[#25262C] hover:bg-[#303138] text-[#F5F3EF] font-medium text-xs cursor-pointer inline-flex items-center gap-1.5 shrink-0 transition-colors">
              <Upload className="w-3.5 h-3.5 text-[#F2BD91]" />
              <span>{selectedFile || editingReceipt ? 'Replace File' : 'Browse File'}</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Title & Store */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1.5">
                Receipt / Invoice Title <span className="text-[#F2BD91]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Apple BKC Official Tax Invoice"
                className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1.5">
                Store / Merchant / Platform
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  placeholder="e.g. Apple Store, Amazon, Reliance Digital"
                  className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
                />
              </div>
            </div>
          </div>

          {/* Invoice # and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1.5">
                Invoice / Bill Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-88231"
                className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1.5">
                Total Amount ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 79900"
                className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1.5">
                Invoice / Upload Date
              </label>
              <input
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-[#F5F3EF] focus:outline-none focus:border-[#F2BD91]"
              />
            </div>
          </div>

          {/* Associated Product & Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1.5">
                Associated Product
              </label>
              <select
                aria-label="Associated Product"
                value={purchaseId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setPurchaseId(pid);
                  const matched = purchases.find((p) => p.id === pid);
                  if (matched) {
                    if (!store) setStore(matched.store);
                    if (amount === '' || amount === 0) setAmount(matched.price);
                    if (!title || title === 'Official Tax Invoice') {
                      setTitle(`${matched.productName} Invoice`);
                    }
                  }
                }}
                className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-[#F5F3EF] focus:outline-none focus:border-[#F2BD91]"
              >
                <option value="">General Expense / Unlinked Invoice</option>
                {purchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productName} ({p.brand}) • {currencySymbol}{p.price.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1.5">
                Category / Document Tag
              </label>
              <select
                aria-label="Category / Document Tag"
                value={categoryTag}
                onChange={(e) => setCategoryTag(e.target.value)}
                className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-[#F5F3EF] focus:outline-none focus:border-[#F2BD91]"
              >
                <option value="Electronics">Electronics & Hardware</option>
                <option value="Smartphones">Smartphones & Mobiles</option>
                <option value="Laptops & PCs">Laptops & PCs</option>
                <option value="Appliances">Home Appliances</option>
                <option value="Audio & Sound">Audio & Sound</option>
                <option value="Telecom & Fiber">Telecom & Fiber</option>
                <option value="Software & Cloud">Software & Cloud</option>
                <option value="Accessories">Accessories & Peripherals</option>
                <option value="General">General Invoices</option>
              </select>
            </div>
          </div>

          {/* Notes / Text Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[#A5A5A5]">
                Invoice Text, Serial Numbers & Warranty Notes
              </label>
              <span className="text-[11px] text-[#7A7C85]">Itemized notes saved to database</span>
            </div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Serial Number: F2LW99..., Includes 2 Years AppleCare+ Protection, Purchased during Diwali festival offer with HDFC 10% instant discount, Store executive contact: +91 98765 00000..."
              className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl p-3.5 text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91] resize-none font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#25262B] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-[#202127] hover:bg-[#282930] text-[#A5A5A5] hover:text-[#F5F3EF] text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] text-xs font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#141518] border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingReceipt ? 'Update Receipt Details' : 'Save Receipt & Notes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
