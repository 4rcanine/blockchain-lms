'use client';

import React, { useRef } from 'react';
import { Trophy, Award, ShieldCheck, Printer, Download } from 'lucide-react';

interface CertificateProps {
    cert: {
        courseTitle: string;
        studentName: string;
        grade: number;
        claimedAt: any;
        certificateId: string;
    };
}

const CertificateCard = ({ cert }: CertificateProps) => {
    const certificateRef = useRef<HTMLDivElement>(null);

    // Format the date safely from Firebase Timestamp or Date object
    const formattedDate = cert.claimedAt?.seconds 
        ? new Date(cert.claimedAt.seconds * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : new Date().toLocaleDateString();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Certificate Container */}
            <div 
                ref={certificateRef}
                className="relative w-full max-w-3xl aspect-[1.414/1] bg-white shadow-2xl rounded-sm p-1 border-[16px] border-double border-indigo-600 print:shadow-none print:border-indigo-600"
                style={{ printColorAdjust: 'exact' }}
            >
                {/* Inner Border Decorative Frame */}
                <div className="h-full w-full border-2 border-indigo-200 p-8 flex flex-col items-center justify-between relative overflow-hidden">
                    
                    {/* Background Watermark Icon */}
                    <Trophy className="absolute -bottom-10 -right-10 w-64 h-64 text-indigo-50 opacity-[0.03] rotate-12" />
                    
                    {/* Header */}
                    <div className="text-center space-y-2 pt-4">
                        <div className="flex justify-center mb-4">
                            <div className="bg-indigo-600 p-3 rounded-full shadow-lg">
                                <Award className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-serif font-bold text-indigo-900 uppercase tracking-[0.2em]">
                            Certificate
                        </h1>
                        <p className="text-sm font-semibold text-indigo-500 uppercase tracking-widest">
                            of Course Completion
                        </p>
                    </div>

                    {/* Body Content */}
                    <div className="text-center space-y-6 flex-grow flex flex-col justify-center">
                        <p className="text-gray-500 italic font-serif text-lg">This is to certify that</p>
                        
                        <div className="space-y-1">
                            <h2 className="text-4xl font-serif font-bold text-gray-900 border-b-2 border-indigo-100 px-12 inline-block pb-2">
                                {cert.studentName || "Valued Student"}
                            </h2>
                        </div>

                        <p className="text-gray-600 max-w-lg mx-auto leading-relaxed">
                            has successfully completed all requirements for the professional course 
                            <span className="block mt-2 text-xl font-bold text-indigo-800">"{cert.courseTitle}"</span>
                        </p>

                        <div className="flex items-center justify-center gap-4 py-4">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-400 uppercase tracking-tighter">Final Grade</span>
                                <span className="text-2xl font-bold text-indigo-600">{cert.grade}%</span>
                            </div>
                            <div className="w-px h-10 bg-indigo-100"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-400 uppercase tracking-tighter">Status</span>
                                <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                                    <ShieldCheck className="w-4 h-4" /> VERIFIED
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="w-full flex justify-between items-end pb-4 px-4 text-sm">
                        <div className="text-left space-y-1">
                            <p className="text-gray-400 text-[10px] font-mono">Issued on</p>
                            <p className="font-semibold text-gray-700 border-t border-gray-200 pt-1">{formattedDate}</p>
                        </div>

                        {/* Seal */}
                        <div className="relative group">
                             <div className="w-20 h-20 border-4 border-indigo-100 rounded-full flex items-center justify-center bg-white shadow-inner">
                                <ShieldCheck className="w-10 h-10 text-indigo-600" />
                             </div>
                        </div>

                        <div className="text-right space-y-1">
                            <p className="text-gray-400 text-[10px] font-mono">Certificate ID</p>
                            <p className="font-mono text-xs font-semibold text-gray-700 border-t border-gray-200 pt-1">{cert.certificateId}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons (Hidden on Print) */}
            <div className="flex gap-4 no-print">
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
                >
                    <Printer className="w-4 h-4" /> Print PDF
                </button>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .h-screen-minus-header { height: auto !important; }
                }
            `}</style>
        </div>
    );
};

export default CertificateCard;