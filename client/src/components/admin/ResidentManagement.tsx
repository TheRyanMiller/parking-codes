import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Resident } from '../../types';
import Modal from '../common/Modal';

const ResidentManagement: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit' | 'view';
    resident: Resident | null;
  }>({ isOpen: false, mode: 'add', resident: null });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    unit: ''
  });

  useEffect(() => {
    loadResidents();
  }, [search, pagination.page]);

  const loadResidents = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getResidents({ 
        search, 
        page: pagination.page, 
        limit: pagination.limit 
      });
      setResidents(response.data.residents);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (err: any) {
      setError('Failed to load residents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (modalState.mode === 'edit' && modalState.resident) {
        await adminAPI.updateResident(modalState.resident.id, formData);
      } else {
        await adminAPI.createResident(formData);
      }
      setFormData({ name: '', email: '', unit: '' });
      setModalState({ isOpen: false, mode: 'add', resident: null });
      loadResidents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save resident');
    }
  };

  const handleEdit = (resident: Resident) => {
    setFormData({
      name: resident.name,
      email: resident.email,
      unit: resident.unit
    });
    setModalState({ isOpen: true, mode: 'edit', resident });
  };

  const handleView = (resident: Resident) => {
    setModalState({ isOpen: true, mode: 'view', resident });
  };

  const handleAdd = () => {
    setFormData({ name: '', email: '', unit: '' });
    setModalState({ isOpen: true, mode: 'add', resident: null });
  };

  const handleDelete = async (id: number) => {
    try {
      await adminAPI.deleteResident(id);
      setDeleteConfirm(null);
      loadResidents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete resident');
    }
  };

  const closeModal = () => {
    setFormData({ name: '', email: '', unit: '' });
    setModalState({ isOpen: false, mode: 'add', resident: null });
    setError('');
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Resident Management</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or unit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>


      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Residents</h3>
          <button
            onClick={handleAdd}
            className="w-8 h-8 bg-green-100 hover:bg-green-200 text-green-600 rounded-full flex items-center justify-center transition-colors"
            title="Add Resident"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resident
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : residents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No residents found
                </td>
              </tr>
            ) : (
              residents.map((resident) => (
                <tr key={resident.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{resident.name}</div>
                      <div className="text-sm text-gray-500">{resident.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {resident.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {resident.last_login_at ? new Date(resident.last_login_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleView(resident)}
                      className="text-gray-600 hover:text-gray-900 mr-2 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      title="View details"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(resident)}
                      className="text-blue-600 hover:text-blue-900 mr-2 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(resident.id)}
                      className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.total > pagination.limit && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page * pagination.limit >= pagination.total}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onRequestClose={closeModal}
        title={modalState.mode === 'add' ? 'Add New Resident' : 
               modalState.mode === 'edit' ? 'Edit Resident' : 'Resident Details'}
        size="sm"
      >
        <div className="p-6">
          {modalState.mode === 'view' ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</span>
                <span className="text-sm font-medium text-gray-900">{modalState.resident?.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</span>
                <span className="text-sm text-gray-900">{modalState.resident?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</span>
                <span className="text-sm font-semibold text-gray-900">{modalState.resident?.unit}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</span>
                <span className="text-sm text-gray-900">
                  {modalState.resident?.created_at ? new Date(modalState.resident.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</span>
                <span className="text-sm text-gray-900">
                  {modalState.resident?.updated_at ? new Date(modalState.resident.updated_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</span>
                <span className="text-sm text-gray-900">
                  {modalState.resident?.last_login_at ? new Date(modalState.resident.last_login_at).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="W332, E509"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {modalState.mode === 'edit' ? 'Update' : 'Add'} Resident
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onRequestClose={() => setDeleteConfirm(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this resident? This action cannot be undone.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm!)}
              className="btn btn-danger flex-1"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResidentManagement;