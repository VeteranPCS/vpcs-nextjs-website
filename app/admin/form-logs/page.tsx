'use client';
import { useState, useEffect } from 'react';
import { getRecentSubmissions, FormSubmissionStatus, FormSubmissionRecord } from '@/services/formTrackingService';
import { LogLevel, getRecentLogs } from '@/services/loggingService';

export default function FormLogsPage() {
    const [submissions, setSubmissions] = useState<FormSubmissionRecord[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'submissions' | 'logs'>('submissions');
    const [statusFilter, setStatusFilter] = useState<FormSubmissionStatus | 'all'>('all');
    const [formTypeFilter, setFormTypeFilter] = useState<string>('all');

    const formTypes = [...new Set(submissions.map(s => s.formType))];

    useEffect(() => {
        try {
            // Load submissions from localStorage
            const recentSubmissions = getRecentSubmissions(100);
            setSubmissions(recentSubmissions);

            // Load logs if available
            try {
                const recentLogs = getRecentLogs(100);
                setLogs(recentLogs);
            } catch (e) {
                console.error('Error loading logs:', e);
            }
        } catch (e) {
            console.error('Error loading submissions:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Filter submissions based on selected filters
    const filteredSubmissions = submissions.filter(submission => {
        if (statusFilter !== 'all' && submission.status !== statusFilter) {
            return false;
        }
        if (formTypeFilter !== 'all' && submission.formType !== formTypeFilter) {
            return false;
        }
        return true;
    });

    const renderStatusBadge = (status: FormSubmissionStatus) => {
        switch (status) {
            case FormSubmissionStatus.SUCCESS:
                return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Success</span>;
            case FormSubmissionStatus.FAILURE:
                return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Failed</span>;
            case FormSubmissionStatus.PENDING:
                return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pending</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{status}</span>;
        }
    };

    const renderLogLevelBadge = (level: LogLevel) => {
        switch (level) {
            case LogLevel.ERROR:
                return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Error</span>;
            case LogLevel.WARN:
                return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Warning</span>;
            case LogLevel.INFO:
                return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Info</span>;
            case LogLevel.DEBUG:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">Debug</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{level}</span>;
        }
    };

    return (
        <div className="container mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold mb-6">Form Submission Logs</h1>

            <div className="mb-6">
                <div className="flex border-b">
                    <button
                        className={`mr-4 py-2 ${activeTab === 'submissions' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('submissions')}
                    >
                        Form Submissions
                    </button>
                    <button
                        className={`py-2 ${activeTab === 'logs' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('logs')}
                    >
                        Application Logs
                    </button>
                </div>
            </div>

            {activeTab === 'submissions' && (
                <>
                    <div className="mb-6 flex flex-wrap gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="border rounded p-2"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as FormSubmissionStatus | 'all')}
                            >
                                <option value="all">All Statuses</option>
                                <option value={FormSubmissionStatus.SUCCESS}>Success</option>
                                <option value={FormSubmissionStatus.FAILURE}>Failed</option>
                                <option value={FormSubmissionStatus.PENDING}>Pending</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Form Type</label>
                            <select
                                className="border rounded p-2"
                                value={formTypeFilter}
                                onChange={(e) => setFormTypeFilter(e.target.value)}
                            >
                                <option value="all">All Form Types</option>
                                {formTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-10">Loading...</div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No form submissions found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="py-2 px-4 border-b text-left">Time</th>
                                        <th className="py-2 px-4 border-b text-left">Form Type</th>
                                        <th className="py-2 px-4 border-b text-left">User</th>
                                        <th className="py-2 px-4 border-b text-left">Status</th>
                                        <th className="py-2 px-4 border-b text-left">Response Code</th>
                                        <th className="py-2 px-4 border-b text-left">Error</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubmissions.map((submission, index) => (
                                        <tr key={submission.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                            <td className="py-2 px-4 border-b">
                                                {new Date(submission.timestamp).toLocaleString()}
                                            </td>
                                            <td className="py-2 px-4 border-b">{submission.formType}</td>
                                            <td className="py-2 px-4 border-b">
                                                {submission.formData.firstName} {submission.formData.lastName}
                                                <div className="text-xs text-gray-500">{submission.formData.email}</div>
                                            </td>
                                            <td className="py-2 px-4 border-b">
                                                {renderStatusBadge(submission.status)}
                                            </td>
                                            <td className="py-2 px-4 border-b">{submission.responseCode || '-'}</td>
                                            <td className="py-2 px-4 border-b">
                                                <div className="text-sm text-red-600 truncate max-w-[200px]" title={submission.errorMessage}>
                                                    {submission.errorMessage || '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'logs' && (
                <>
                    {loading ? (
                        <div className="text-center py-10">Loading...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No logs found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="py-2 px-4 border-b text-left">Time</th>
                                        <th className="py-2 px-4 border-b text-left">Level</th>
                                        <th className="py-2 px-4 border-b text-left">Message</th>
                                        <th className="py-2 px-4 border-b text-left">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                            <td className="py-2 px-4 border-b">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="py-2 px-4 border-b">
                                                {renderLogLevelBadge(log.level)}
                                            </td>
                                            <td className="py-2 px-4 border-b">{log.message}</td>
                                            <td className="py-2 px-4 border-b">
                                                <details>
                                                    <summary className="cursor-pointer">View Details</summary>
                                                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                                        {JSON.stringify(log.data, null, 2)}
                                                    </pre>
                                                    {log.error && (
                                                        <div className="mt-2">
                                                            <div className="font-semibold text-red-600 text-xs">Error:</div>
                                                            <pre className="p-2 bg-red-50 text-red-800 rounded text-xs overflow-auto max-h-40">
                                                                {JSON.stringify(log.error, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </details>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
} 