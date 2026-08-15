import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeDisplay = ({ queue, onComplete }) => {
  const joinUrl = queue.joinUrl || `${window.location.origin}/join/${queue.publicCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    alert('Link copied to clipboard!');
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-code');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `queue-${queue.publicCode}-qr.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Queue Created!</h2>

        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-block p-4 bg-white border border-gray-200 rounded-xl">
              <QRCodeSVG
                id="qr-code"
                value={joinUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Queue Code</div>
              <div className="font-mono font-semibold text-gray-900">{queue.publicCode}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Admin Code</div>
              <div className="font-mono font-semibold text-gray-900">{queue.adminCode}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Join URL</div>
              <div className="text-sm text-gray-900 break-all">{joinUrl}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyLink}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Copy Link
            </button>
            <button
              onClick={downloadQR}
              className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              Download QR
            </button>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-2 px-4 text-gray-600 text-sm font-medium hover:text-gray-900"
          >
            Create Another Queue
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
