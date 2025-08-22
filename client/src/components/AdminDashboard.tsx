import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import { DashboardStats } from '../types';
import ResidentManagement from './admin/ResidentManagement';
import AdminManagement from './admin/AdminManagement';
import CodeManagement from './admin/CodeManagement';
import AuditLogs from './admin/AuditLogs';
import Modal from './common/Modal';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isLoading, setIsLoading] = useState(true);
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    title: string;
    status: string;
    codes: any[];
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    status: '',
    codes: [],
    isLoading: false
  });

  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean;
    code: any;
    residents: any[];
    isLoading: boolean;
    assignTo: string;
  }>({
    isOpen: false,
    code: null,
    residents: [],
    isLoading: false,
    assignTo: ''
  });

  const [copyFeedback, setCopyFeedback] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    loadDashboardStats();
  }, [selectedMonth]);

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getDashboard(selectedMonth);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCodesModal = async (status: string, title: string) => {
    setModalData(prev => ({
      ...prev,
      isOpen: true,
      title,
      status,
      isLoading: true,
      codes: []
    }));

    try {
      const response = await adminAPI.getCodesByStatus(status, selectedMonth);
      setModalData(prev => ({
        ...prev,
        codes: response.data.codes,
        isLoading: false
      }));
    } catch (err) {
      console.error('Failed to load codes:', err);
      setModalData(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  };

  const closeModal = () => {
    setModalData({
      isOpen: false,
      title: '',
      status: '',
      codes: [],
      isLoading: false
    });
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedback(prev => ({ ...prev, [code]: true }));
      setTimeout(() => {
        setCopyFeedback(prev => ({ ...prev, [code]: false }));
      }, 1000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openAssignModal = async (code: any) => {
    setAssignModal(prev => ({
      ...prev,
      isOpen: true,
      code,
      isLoading: true,
      assignTo: ''
    }));

    try {
      const response = await adminAPI.getResidents({ search: '', page: 1, limit: 100 });
      setAssignModal(prev => ({
        ...prev,
        residents: response.data.residents,
        isLoading: false
      }));
    } catch (err) {
      console.error('Failed to load residents:', err);
      setAssignModal(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  };

  const closeAssignModal = () => {
    setAssignModal({
      isOpen: false,
      code: null,
      residents: [],
      isLoading: false,
      assignTo: ''
    });
  };

  const handleAssignCode = async () => {
    if (!assignModal.code || !assignModal.assignTo) return;

    try {
      await adminAPI.assignCode(assignModal.code.id, assignModal.assignTo);
      closeAssignModal();
      loadDashboardStats();
      if (modalData.isOpen) {
        openCodesModal(modalData.status, modalData.title);
      }
    } catch (err) {
      console.error('Failed to assign code:', err);
    }
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'residents', name: 'Residents', icon: '👥' },
    { id: 'codes', name: 'Codes', icon: '🎫' },
    { id: 'admins', name: 'Admins', icon: '🔐' },
    { id: 'audit', name: 'Audit', icon: '📋' },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="flex items-center space-x-4">
          <label htmlFor="month" className="text-sm font-medium text-gray-700">
            Month:
          </label>
          <input
            type="month"
            id="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card card-mint hover-lift p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Uploaded</div>
            <div className="text-3xl font-bold text-blue-600">{stats.uploaded}</div>
          </div>
          <button
            onClick={() => openCodesModal('assigned', 'Assigned Codes')}
            className="card card-yellow hover-lift p-6 text-left transition-all border-none cursor-pointer"
          >
            <div className="text-sm font-medium text-gray-500 mb-1">Assigned</div>
            <div className="text-3xl font-bold text-green-600">{stats.assigned}</div>
          </button>
          <button
            onClick={() => openCodesModal('unassigned', 'Remaining Codes')}
            className="card card-lavender hover-lift p-6 text-left transition-all border-none cursor-pointer"
          >
            <div className="text-sm font-medium text-gray-500 mb-1">Remaining</div>
            <div className="text-3xl font-bold text-orange-600">{stats.remaining}</div>
          </button>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No data available for selected month
        </div>
      )}

    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'residents':
        return <ResidentManagement />;
      case 'codes':
        return <CodeManagement onStatsUpdate={loadDashboardStats} />;
      case 'admins':
        return <AdminManagement />;
      case 'audit':
        return <AuditLogs />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Signed in as {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <nav className="w-56 bg-white shadow-sm border-r border-gray-200 flex-shrink-0">
          <div className="p-4">
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {renderActiveTab()}
          </div>
        </main>
      </div>

      {/* Codes Modal */}
      <Modal
        isOpen={modalData.isOpen}
        onRequestClose={closeModal}
        title={modalData.title}
        size={modalData.status === 'assigned' ? 'lg' : 'md'}
      >
        {modalData.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : modalData.codes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {modalData.status} codes found for {selectedMonth}
          </div>
        ) : (
          <>
            <div className="p-4">
              {modalData.status === 'assigned' ? (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resident
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modalData.codes.map((code) => (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {code.code}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                          {code.resident_name || 'Unknown'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {code.resident_unit || 'Unknown'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                          {code.assigned_at ? new Date(code.assigned_at).toLocaleDateString() : 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="space-y-2">
                  {modalData.codes.map((code) => (
                  <div key={code.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="font-mono text-base font-semibold text-gray-900">
                      {code.code}
                    </span>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          copyFeedback[code.code] 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                        }`}
                        title="Copy code"
                      >
                        {copyFeedback[code.code] ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => openAssignModal(code)}
                        className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 border border-green-200 rounded-md hover:bg-green-200 transition-all"
                        title="Assign code"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 text-sm text-gray-500 text-center bg-gray-50">
              Showing {modalData.codes.length} {modalData.status} codes for {selectedMonth}
            </div>
          </>
        )}
      </Modal>

      {/* Assignment Modal */}
      <Modal
        isOpen={assignModal.isOpen}
        onRequestClose={closeAssignModal}
        title={`Assign Code ${assignModal.code?.code}`}
        size="sm"
      >
        <div className="p-6">
          {assignModal.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to:
                </label>
                <select
                  value={assignModal.assignTo}
                  onChange={(e) => setAssignModal(prev => ({ ...prev, assignTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  <option value="ADMIN">ADMIN (Remove from circulation)</option>
                  {assignModal.residents.map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.name} - {resident.unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleAssignCode}
                  disabled={!assignModal.assignTo}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  Assign
                </button>
                <button
                  onClick={closeAssignModal}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;