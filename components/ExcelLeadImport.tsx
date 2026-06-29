'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import { createLead, CreateLeadData } from '@/app/services/leadsService';

interface ImportResult {
    row: number;
    name: string;
    status: 'success' | 'error' | 'duplicate';
    message: string;
}

interface ExcelLeadImportProps {
    onClose: () => void;
    onImportComplete: (count: number) => void;
}

const VALID_STAGES = ['New', 'Incoming', 'Contacted', 'Qualified', 'Second Wing', 'Won', 'Lost'];
const VALID_SOURCES = ['WhatsApp', 'Facebook', 'Instagram', 'Website', 'Referral', 'Cold Call', 'Email', 'Social Media', 'Other'];

function normalizeStage(val: string): string {
    if (!val) return 'New';
    const cleaned = val.trim();
    if (cleaned.toLowerCase() === 'proposal') return 'Second Wing';
    const match = VALID_STAGES.find(s => s.toLowerCase() === cleaned.toLowerCase());
    return match || 'New';
}

function normalizeSource(val: string): string {
    if (!val) return 'Other';
    const cleaned = val.trim();
    const match = VALID_SOURCES.find(s => s.toLowerCase() === cleaned.toLowerCase());
    return match || 'Other';
}

export default function ExcelLeadImport({ onClose, onImportComplete }: ExcelLeadImportProps) {
    const [dragOver, setDragOver] = useState(false);
    const [parsedRows, setParsedRows] = useState<any[]>([]);
    const [fileName, setFileName] = useState('');
    const [headers, setHeaders] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<ImportResult[]>([]);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseFile = useCallback((file: File) => {
        setError('');
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            setError('Please upload a valid Excel file (.xlsx, .xls) or CSV file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                if (json.length === 0) {
                    setError('The file appears to be empty.');
                    return;
                }

                setFileName(file.name);
                setHeaders(Object.keys(json[0]));
                setParsedRows(json);
            } catch {
                setError('Failed to parse the file. Please make sure it is a valid Excel/CSV file.');
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) parseFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
    };

    const detectColumn = (hdrs: string[], candidates: string[]): string => {
        for (const c of candidates) {
            const found = hdrs.find(h => h.toLowerCase().includes(c.toLowerCase()));
            if (found) return found;
        }
        return '';
    };

    const nameCol   = detectColumn(headers, ['name', 'full name', 'contact', 'client']);
    const phoneCol  = detectColumn(headers, ['phone', 'mobile', 'contact number', 'number', 'tel']);
    const emailCol  = detectColumn(headers, ['email', 'e-mail', 'mail']);
    const stageCol  = detectColumn(headers, ['stage', 'status', 'pipeline']);
    const sourceCol = detectColumn(headers, ['source', 'channel', 'origin']);
    const companyCol = detectColumn(headers, ['company', 'organization', 'business', 'firm']);

    const handleImport = async () => {
        if (!nameCol || !phoneCol) {
            setError('Could not detect Name and Phone columns. Ensure your file has columns named "Name" and "Phone".');
            return;
        }

        setImporting(true);
        setResults([]);
        setProgress(0);

        const importResults: ImportResult[] = [];
        let successCount = 0;

        for (let i = 0; i < parsedRows.length; i++) {
            const row = parsedRows[i];
            const name = String(row[nameCol] || '').trim();
            const phone = String(row[phoneCol] || '').trim();

            if (!name || !phone) {
                importResults.push({ row: i + 2, name: name || '(empty)', status: 'error', message: 'Missing name or phone' });
                setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
                setResults([...importResults]);
                continue;
            }

            const leadData: CreateLeadData = {
                name,
                phone,
                email: emailCol ? String(row[emailCol] || '').trim() || undefined : undefined,
                stage: stageCol ? normalizeStage(String(row[stageCol])) : 'New',
                source: sourceCol ? normalizeSource(String(row[sourceCol])) : 'Other',
                company: companyCol ? String(row[companyCol] || '').trim() || undefined : undefined,
            };

            try {
                await createLead(leadData);
                importResults.push({ row: i + 2, name, status: 'success', message: 'Imported successfully' });
                successCount++;
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || 'Unknown error';
                const isDuplicate = msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate');
                importResults.push({
                    row: i + 2, name,
                    status: isDuplicate ? 'duplicate' : 'error',
                    message: isDuplicate ? 'Phone number already exists' : msg
                });
            }

            setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
            setResults([...importResults]);
        }

        setImporting(false);
        setDone(true);
        onImportComplete(successCount);
    };

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount   = results.filter(r => r.status === 'error').length;
    const dupCount     = results.filter(r => r.status === 'duplicate').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200/60">

                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-slate-900">Import Leads from Excel</h2>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Upload .xlsx, .xls, or .csv files</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

                    {/* Drop Zone */}
                    {!parsedRows.length && (
                        <>
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                                    dragOver ? 'border-primary bg-blue-50/60' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                                        <Upload className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold text-slate-700">Drop your Excel file here</p>
                                        <p className="text-[12px] text-slate-400 mt-1">or <span className="text-primary font-semibold">click to browse</span></p>
                                    </div>
                                    <p className="text-[11px] text-slate-300 font-medium">.xlsx &bull; .xls &bull; .csv</p>
                                </div>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                            </div>

                            {/* Column guide */}
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                                <div className="flex items-start gap-2.5">
                                    <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[12px] font-bold text-slate-700 mb-2">Recommended column names</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                            {[['Name','Required'],['Phone','Required'],['Email','Optional'],['Stage','Optional'],['Source','Optional'],['Company','Optional']].map(([col, req]) => (
                                                <div key={col} className="flex items-center gap-1.5">
                                                    <span className="text-[11px] font-bold text-slate-600">{col}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${req === 'Required' ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>{req}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                            <p className="text-[12px] font-semibold text-rose-600">{error}</p>
                        </div>
                    )}

                    {/* File parsed — preview */}
                    {parsedRows.length > 0 && !done && (
                        <>
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                                    <div>
                                        <p className="text-[13px] font-bold text-slate-800">{fileName}</p>
                                        <p className="text-[11px] text-slate-400">{parsedRows.length} rows detected</p>
                                    </div>
                                </div>
                                <button onClick={() => { setParsedRows([]); setFileName(''); setHeaders([]); setError(''); }} className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors">Remove</button>
                            </div>

                            {/* Column mapping */}
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Detected Column Mapping</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { field: 'Name', col: nameCol, required: true },
                                        { field: 'Phone', col: phoneCol, required: true },
                                        { field: 'Email', col: emailCol, required: false },
                                        { field: 'Stage', col: stageCol, required: false },
                                        { field: 'Source', col: sourceCol, required: false },
                                        { field: 'Company', col: companyCol, required: false },
                                    ].map(({ field, col, required }) => (
                                        <div key={field} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-[12px] ${col ? 'border-emerald-100 bg-emerald-50/40' : required ? 'border-rose-100 bg-rose-50/40' : 'border-slate-100 bg-slate-50/40'}`}>
                                            <span className="font-bold text-slate-600">{field}</span>
                                            <span className={`font-semibold truncate max-w-[120px] ${col ? 'text-emerald-600' : required ? 'text-rose-400' : 'text-slate-300'}`}>
                                                {col || (required ? 'NOT FOUND' : 'not mapped')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview table */}
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Preview (first {Math.min(5, parsedRows.length)} rows)</p>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-400">Name</th>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-400">Phone</th>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-400 hidden sm:table-cell">Stage</th>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-400 hidden sm:table-cell">Source</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedRows.slice(0, 5).map((row, i) => (
                                                <tr key={i} className="border-b border-slate-50 last:border-0">
                                                    <td className="px-4 py-2.5 font-medium text-slate-700">{nameCol ? String(row[nameCol] || '—') : '—'}</td>
                                                    <td className="px-4 py-2.5 text-slate-500">{phoneCol ? String(row[phoneCol] || '—') : '—'}</td>
                                                    <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{stageCol ? normalizeStage(String(row[stageCol] || '')) : 'New'}</td>
                                                    <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{sourceCol ? normalizeSource(String(row[sourceCol] || '')) : 'Other'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsedRows.length > 5 && (
                                        <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-400 font-medium">+ {parsedRows.length - 5} more rows</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Progress */}
                    {importing && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[13px] font-bold text-slate-700">Importing leads...</p>
                                <span className="text-[13px] font-bold text-primary">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className="h-2 bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">{results.length} of {parsedRows.length} processed</p>
                        </div>
                    )}

                    {/* Results summary */}
                    {results.length > 0 && (
                        <div className="space-y-3">
                            {done && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                                        <p className="text-[20px] font-bold text-emerald-600">{successCount}</p>
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Imported</p>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                                        <p className="text-[20px] font-bold text-amber-600">{dupCount}</p>
                                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Duplicates</p>
                                    </div>
                                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-center">
                                        <p className="text-[20px] font-bold text-rose-600">{errorCount}</p>
                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">Errors</p>
                                    </div>
                                </div>
                            )}
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {results.filter(r => r.status !== 'success').map((r, i) => (
                                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] ${r.status === 'duplicate' ? 'bg-amber-50 border border-amber-100' : 'bg-rose-50 border border-rose-100'}`}>
                                        <AlertCircle className={`h-3.5 w-3.5 shrink-0 ${r.status === 'duplicate' ? 'text-amber-500' : 'text-rose-500'}`} />
                                        <span className="font-bold text-slate-600">Row {r.row}</span>
                                        <span className="font-medium text-slate-500 truncate">{r.name}</span>
                                        <span className={`ml-auto font-semibold shrink-0 ${r.status === 'duplicate' ? 'text-amber-600' : 'text-rose-600'}`}>{r.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-slate-100 flex items-center justify-between gap-4">
                    {done ? (
                        <>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                <span className="text-[13px] font-bold text-slate-700">Import complete — {successCount} leads added</span>
                            </div>
                            <button onClick={onClose} className="px-6 py-2.5 bg-primary text-white text-[13px] font-bold rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-blue-500/20">Done</button>
                        </>
                    ) : (
                        <>
                            <button onClick={onClose} disabled={importing} className="px-5 py-2.5 text-[13px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                            <button
                                onClick={handleImport}
                                disabled={!parsedRows.length || importing || !nameCol || !phoneCol}
                                className="flex items-center gap-2.5 px-6 py-2.5 bg-primary text-white text-[13px] font-bold rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {importing ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                                ) : (
                                    <><Upload className="h-4 w-4" /> Import {parsedRows.length > 0 ? `${parsedRows.length} Leads` : 'Leads'}</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
