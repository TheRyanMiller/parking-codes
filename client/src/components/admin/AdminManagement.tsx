import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Admin } from '../../types';
import Modal from '../common/Modal';

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'view';
    admin: Admin | null;
  }>({ isOpen: false, mode: 'add', admin: null });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getAdmins();
      setAdmins(response.data);
    } catch (err: any) {
      setError('Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await adminAPI.createAdmin(formData.email, formData.password);
      setFormData({ email: '', password: '' });
      setModalState({ isOpen: false, mode: 'add', admin: null });
      loadAdmins();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create admin');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminAPI.deleteAdmin(id);
      setDeleteConfirm(null);
      loadAdmins();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete admin');
    }
  };

  const handleView = (admin: Admin) => {
    setModalState({ isOpen: true, mode: 'view', admin });
  };

  const handleAdd = () => {
    setFormData({ email: '', password: '' });
    setModalState({ isOpen: true, mode: 'add', admin: null });
  };

  const closeModal = () => {
    setFormData({ email: '', password: '' });
    setModalState({ isOpen: false, mode: 'add', admin: null });
    setError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Management</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}


      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Admins</h3>
          <button
            onClick={handleAdd}
            className="w-8 h-8 bg-green-100 hover:bg-green-200 text-green-600 rounded-full flex items-center justify-center transition-colors"
            title="Add Admin"
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
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  No admins found
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {admin.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleView(admin)}
                      className="text-gray-600 hover:text-gray-900 mr-2 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      title="View details"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(admin.id)}
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

      {/* Main Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onRequestClose={closeModal}
        title={modalState.mode === 'add' ? 'Add New Admin' : 'Admin Details'}
        size="sm"
      >
        <div className="p-6">
          {modalState.mode === 'view' ? (
            <div className="space-y-4 text-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="text-sm text-gray-900">{modalState.admin?.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <div className="text-sm text-gray-900">
                  {modalState.admin?.created_at ? new Date(modalState.admin.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  minLength={8}
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  Add Admin
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
            Are you sure you want to delete this admin? This action cannot be undone.
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

export default AdminManagement;