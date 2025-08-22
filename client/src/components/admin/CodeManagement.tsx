import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Resident } from '../../types';

interface CodeManagementProps {
  onStatsUpdate: () => void;
}

const CodeManagement: React.FC<CodeManagementProps> = ({ onStatsUpdate }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [assignForm, setAssignForm] = useState({
    residentId: '',
    count: 1
  });

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      const response = await adminAPI.getResidents({ limit: 100 });
      setResidents(response.data.residents);
    } catch (err) {
      console.error('Failed to load residents:', err);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const response = await adminAPI.uploadCodes(file, selectedMonth);
      setUploadResult(response.data);
      onStatsUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload codes');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssignCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.residentId) return;

    try {
      await adminAPI.assignCodes(selectedMonth, parseInt(assignForm.residentId), assignForm.count);
      setAssignForm({ residentId: '', count: 1 });
      onStatsUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign codes');
    }
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Code Management</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Upload Code Pool</h3>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV/Excel File
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <h4 className="text-xs font-medium text-blue-800 mb-1">📁 File Format Requirements:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• <strong>CSV or Excel</strong> (.csv, .xlsx, .xls)</li>
                  <li>• <strong>Codes in first column</strong> (A1, A2, A3...)</li>
                  <li>• <strong>No headers</strong> - start with codes immediately</li>
                  <li>• <strong>Example:</strong> FL493JL, NK582MX, QR759ZY</li>
                </ul>
              </div>
            </div>
            <button
              type="submit"
              disabled={isUploading}
              className="btn btn-primary w-full"
            >
              {isUploading ? 'Uploading...' : 'Upload Codes'}
            </button>
          </form>

          {uploadResult && (
            <div className="mt-4 p-4 bg-green-50 rounded-md">
              <h4 className="font-medium text-green-800">Upload Complete</h4>
              <p className="text-sm text-green-700">
                {uploadResult.inserted} codes uploaded, {uploadResult.skipped} skipped
              </p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Assign Codes</h3>
          <form onSubmit={handleAssignCodes} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resident
              </label>
              <select
                value={assignForm.residentId}
                onChange={(e) => setAssignForm({ ...assignForm, residentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select a resident</option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.name} - {resident.unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Codes
              </label>
              <select
                value={assignForm.count}
                onChange={(e) => setAssignForm({ ...assignForm, count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-success w-full"
            >
              Assign Codes
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};

export default CodeManagement;