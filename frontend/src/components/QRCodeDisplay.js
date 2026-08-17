import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeDisplay = ({ queue, onComplete, onGoToAdmin }) => {
  const baseUrl = window.location.origin;

  const copyLink = (code) => {
    const link = `${baseUrl}/join-sub/${code}`;
    navigator.clipboard.writeText(link);
    alert('Link copied!');
  };

  const downloadQR = (code, name) => {
    const svgEl = document.getElementById(`qr-${code}`);
    if (svgEl) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.download = `queue-${name}-${code}-qr.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const subQueues = queue.types || [];

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Queue Created!</h2>
        <p className="text-sm text-gray-600 mb-6">Share these with each sub-queue counter</p>

        <div className="space-y-6">
          {subQueues.length > 0 ? (
            subQueues.map((sub) => (
              <div key={sub.id} className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{sub.name}</h3>

                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <QRCodeSVG
                      id={`qr-${sub.public_code}`}
                      value={`${baseUrl}/join-sub/${sub.public_code}`}
                      size={140}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">Queue Code</div>
                    <div className="font-mono font-semibold text-gray-900 text-sm">{sub.public_code}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">Admin Code</div>
                    <div className="font-mono font-semibold text-gray-900 text-sm">{sub.adminCode || 'N/A'}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">Join Link</div>
                    <div className="text-xs text-gray-900 break-all">{`${baseUrl}/join-sub/${sub.public_code}`}</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => copyLink(sub.public_code)}
                    className="flex-1 py-1.5 px-3 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => downloadQR(sub.public_code, sub.name)}
                    className="flex-1 py-1.5 px-3 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
                  >
                    Download QR
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">No sub-queues</div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onComplete}
            className="flex-1 py-2 px-4 text-gray-600 text-sm font-medium hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            Create Another
          </button>
          <button
            onClick={onGoToAdmin}
            className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Go to Queue
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
