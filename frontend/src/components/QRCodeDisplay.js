import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeDisplay = ({ queue, onComplete, onGoToAdmin }) => {
  const [networkIP, setNetworkIP] = useState('');

  useEffect(() => {
    const detectIP = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        setNetworkIP(data.ip);
      } catch {
        setNetworkIP(window.location.hostname);
      }
    };
    detectIP();
  }, []);

  const getBaseUrl = () => {
    return networkIP ? `${window.location.protocol}//${networkIP}:3000` : window.location.origin;
  };

  const copySubLink = (code) => {
    navigator.clipboard.writeText(`${getBaseUrl()}/join-sub/${code}`);
    alert('Link copied!');
  };

  const copyOrgLink = () => {
    navigator.clipboard.writeText(`${getBaseUrl()}/join/${queue.publicCode || queue.public_code}`);
    alert('Organisation link copied!');
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

  const downloadOrgQR = () => {
    const svgEl = document.getElementById('qr-organisation');
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
        link.download = `organisation-${queue.name}-qr.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const subQueues = queue.types || [];
  const orgCode = queue.publicCode || queue.public_code;
  const orgUrl = `${getBaseUrl()}/join/${orgCode}`;

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Queue Created!</h2>
        <p className="text-sm text-gray-600 mb-6">Share these codes and QR codes with your counters</p>

        {/* Master Organisation Section */}
        <div className="border-2 border-gray-900 rounded-xl p-4 mb-6 bg-gray-50">
          <h3 className="font-bold text-gray-900 mb-3">{queue.name}</h3>

          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <QRCodeSVG
                id="qr-organisation"
                value={orgUrl}
                size={140}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="p-2 bg-white rounded-lg">
              <div className="text-xs text-gray-500">Organisation Code</div>
              <div className="font-mono font-semibold text-gray-900 text-sm">{orgCode}</div>
            </div>
            <div className="p-2 bg-white rounded-lg">
              <div className="text-xs text-gray-500">Admin Code</div>
              <div className="font-mono font-semibold text-gray-900 text-sm">{queue.adminCode || 'N/A'}</div>
            </div>
            <div className="p-2 bg-white rounded-lg">
              <div className="text-xs text-gray-500">Join Link</div>
              <div className="text-xs text-gray-900 break-all">{orgUrl}</div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={copyOrgLink}
              className="flex-1 py-1.5 px-3 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50"
            >
              Copy Link
            </button>
            <button
              onClick={downloadOrgQR}
              className="flex-1 py-1.5 px-3 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
            >
              Download QR
            </button>
          </div>
        </div>

        {/* Sub-Queues Section */}
        {subQueues.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Sub-Queues</p>
            {subQueues.map((sub) => {
              const subUrl = `${getBaseUrl()}/join-sub/${sub.public_code || sub.publicCode}`;
              return (
                <div key={sub.id} className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{sub.name}</h3>

                  <div className="flex justify-center mb-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <QRCodeSVG
                        id={`qr-${sub.public_code || sub.publicCode}`}
                        value={subUrl}
                        size={140}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Queue Code</div>
                      <div className="font-mono font-semibold text-gray-900 text-sm">{sub.public_code || sub.publicCode}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Admin Code</div>
                      <div className="font-mono font-semibold text-gray-900 text-sm">{sub.adminCode || 'N/A'}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Join Link</div>
                      <div className="text-xs text-gray-900 break-all">{subUrl}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => copySubLink(sub.public_code || sub.publicCode)}
                      className="flex-1 py-1.5 px-3 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => downloadQR(sub.public_code || sub.publicCode, sub.name)}
                      className="flex-1 py-1.5 px-3 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
                    >
                      Download QR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
