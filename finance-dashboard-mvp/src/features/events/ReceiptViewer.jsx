import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { Modal } from '../common/components/Modal';

// Las URLs de Supabase Storage son absolutas; el fallback local ('/uploads/...')
// se sirve desde el origin del backend, no del frontend.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'https://finance-api-9fe5.onrender.com/api/')
    .replace(/\/api\/?$/, '');

function resolveUrl(u) {
    if (!u) return '';
    return u.startsWith('http') ? u : `${API_ORIGIN}${u}`;
}

export function ReceiptViewer({ isOpen, onClose, url, filename }) {
    const src = resolveUrl(url);
    const isPdf = (filename || url || '').toLowerCase().endsWith('.pdf');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={filename || 'Recibo'} size="lg">
            <div className="space-y-4">
                {isPdf ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <FileText className="w-12 h-12 text-orange-500" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{filename || 'Documento PDF'}</p>
                    </div>
                ) : (
                    <img src={src} alt={filename || 'Recibo'} className="w-full rounded-xl object-contain max-h-[60vh] bg-zinc-100 dark:bg-zinc-800" />
                )}
                <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white bg-orange-600 hover:bg-orange-700 font-medium transition-colors"
                >
                    <ExternalLink className="w-4 h-4" />
                    Abrir en pestaña nueva
                </a>
            </div>
        </Modal>
    );
}
