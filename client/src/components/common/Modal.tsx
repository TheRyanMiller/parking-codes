import React from 'react';
import ReactModal from 'react-modal';

interface ModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  maxHeight?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onRequestClose,
  title,
  children,
  size = 'md',
  maxHeight = '80vh'
}) => {
  const sizeMap = {
    sm: '320px',
    md: '500px',
    lg: '600px',
    xl: '800px'
  };

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      style={{
        overlay: {
          backgroundColor: 'rgba(156, 163, 175, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        },
        content: {
          position: 'relative',
          top: 'auto',
          left: 'auto',
          right: 'auto',
          bottom: 'auto',
          border: '1px solid #d1d5db',
          borderRadius: '12px',
          padding: 0,
          margin: 0,
          maxWidth: '90vw',
          maxHeight: maxHeight,
          width: sizeMap[size],
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 text-center">{title}</h3>
      </div>

      {/* Scrollable Content */}
      <div 
        className="flex-1 bg-white"
        style={{ 
          overflowY: 'auto',
          minHeight: 0 // Important for flex scrolling
        }}
      >
        {children}
      </div>
    </ReactModal>
  );
};

export default Modal;